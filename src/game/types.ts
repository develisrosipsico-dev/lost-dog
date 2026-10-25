export type Direction = "up" | "down" | "left" | "right";
export type GameState = "START" | "PLAYING" | "VICTORY" | "GAMEOVER";
export type PowerupKind = "speed" | "range" | "bomb";
export interface Position {
  x: number;
  y: number;
}
export interface Player extends Position {
  size: number;
  speed: number;
  speedLevel: number;
  lives: number;
  maxBombs: number;
  bombRange: number;
  facing: Direction;
  isMoving: boolean;
  walkCycle: number;
  dustTimer: number;
  invulnerableTimer: number;
}
export type CatBreed = "orange" | "tuxedo" | "calico" | "siamese";
export type CatBehavior = "linear" | "wander" | "hunter";
export interface Cat extends Position {
  breed?: CatBreed;
  behavior?: CatBehavior;
  target?: { col: number; row: number } | null;
  size: number;
  speed: number;
  dir: Direction;
  animTime: number;
  alive: boolean;
}
export interface Bomb extends Position {
  col: number;
  row: number;
  timer: number;
  maxTimer: number;
  range: number;
  noteTimer: number;
  playerCanExit: boolean;
}
export interface Explosion {
  col: number;
  row: number;
  dirType: string;
  isTip: boolean | number;
  life: number;
  maxLife: number;
}
export interface Powerup extends Position {
  col: number;
  row: number;
  type: PowerupKind;
  anim: number;
}
export interface Particle extends Position {
  vx: number;
  vy: number;
  gravity: number;
  color: string;
  size: number;
  life: number;
  type: string;
}
export interface FloatingText extends Position {
  text: string;
  color: string;
  vy: number;
  life: number;
  maxLife: number;
}

import type Phaser from "phaser";

export const PHASE2_TEXTURE = "phase2-art";
export const PHASE2_METADATA = "phase2-art-metadata";
export const PHASE2_FRAMES = {
  grass: 0,
  fern: 1,
  dirt: 2,
  bush: 3,
  bushCut: 4,
  tree: 5,
  rock: 6,
  fossil: 7,
  wormhole0: 8,
  wormhole1: 9,
  caveLeft: 10,
  caveRight: 11,
  amber: 12,
  meat: 13,
  feather: 14,
  leaf: 15,
  dogIdle: 16,
  dogBark: 17,
  saberOrange0: 18,
  saberOrange1: 19,
  saberSiamese0: 20,
  saberSiamese1: 21,
  saberCalico0: 22,
  saberCalico1: 23,
  raptor0: 24,
  raptor1: 25,
  triceratops0: 26,
  triceratops1: 27,
  trilobite0: 28,
  trilobite1: 29,
  saberGray0: 30,
  saberGray1: 31,
} as const;

export interface Phase2ArtManifest {
  version: number;
  status: "visual-preview";
  image: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
  frames: Record<keyof typeof PHASE2_FRAMES, number>;
  animations: {
    key: string;
    frames: number[];
    frameRate: number;
    repeat: number;
  }[];
  map: {
    columns: number;
    rows: number;
    width: number;
    height: number;
    tiles: string[];
    spawn: { col: number; row: number };
    goal: { col: number; row: number };
    playerPreview: { col: number; row: number };
    caveFootprint: {
      widthTiles: number;
      heightTiles: number;
      offsetCol: number;
    };
    legend: Record<string, string>;
  };
  previewActors: {
    type: string;
    col: number;
    row: number;
    hiddenUnderBush?: boolean;
  }[];
}

/** Asset-only contract: this module does not add levels, AI or campaign rules. */
export function validatePhase2Art(value: unknown): Phase2ArtManifest {
  const data = value as Phase2ArtManifest | undefined;
  if (
    !data ||
    data.status !== "visual-preview" ||
    data.frameWidth !== 32 ||
    data.frameHeight !== 32 ||
    data.columns !== 8 ||
    data.rows !== 4 ||
    data.width !== 256 ||
    data.height !== 128 ||
    !data.frames
  ) {
    throw new Error(
      "A arte da Fase 2 precisa de uma folha 8×4 com frames de 32×32 pixels.",
    );
  }
  for (const [name, index] of Object.entries(PHASE2_FRAMES)) {
    if (data.frames[name as keyof typeof PHASE2_FRAMES] !== index)
      throw new Error(`Índice de sprite incorreto: ${name}`);
  }
  if (
    !Array.isArray(data.animations) ||
    new Set(data.animations.map((animation) => animation.key)).size !==
      data.animations.length
  )
    throw new Error("Animações da Fase 2 inválidas.");
  for (const animation of data.animations) {
    if (
      !animation.key ||
      !Array.isArray(animation.frames) ||
      animation.frames.length !== 2 ||
      animation.frames.some(
        (frame) => !Number.isInteger(frame) || frame < 0 || frame >= 32,
      ) ||
      !(animation.frameRate > 0) ||
      !Number.isInteger(animation.repeat) ||
      animation.repeat < -1
    )
      throw new Error(`Animação inválida: ${animation.key}`);
  }
  const map = data.map;
  if (
    !map ||
    map.columns !== 15 ||
    map.rows !== 13 ||
    map.width !== 480 ||
    map.height !== 416 ||
    !Array.isArray(map.tiles) ||
    map.tiles.length !== 13 ||
    map.tiles.some(
      (row) =>
        typeof row !== "string" || row.length !== 15 || /[^TRFB.DWC]/.test(row),
    )
  )
    throw new Error("A prévia precisa de um mapa 15×13.");
  if (
    map.spawn?.col !== 1 ||
    map.spawn?.row !== 11 ||
    map.goal?.col !== 13 ||
    map.goal?.row !== 1 ||
    map.tiles[11][1] !== "W" ||
    map.tiles[1][13] !== "C" ||
    map.tiles.join("").split("W").length !== 2 ||
    map.tiles.join("").split("C").length !== 2
  )
    throw new Error("Portal ou caverna fora das posições definidas.");
  if (
    map.caveFootprint?.widthTiles !== 2 ||
    map.caveFootprint?.heightTiles !== 1 ||
    map.caveFootprint?.offsetCol !== -1
  )
    throw new Error("A caverna deve ocupar dois tiles horizontais.");
  return data;
}

/** Call from a future scene's preload. Nothing is loaded in the Phase 1 scene. */
export function loadPhase2Art(
  scene: Pick<Phaser.Scene, "load">,
  baseUrl = import.meta.env.BASE_URL,
) {
  scene.load.spritesheet(
    PHASE2_TEXTURE,
    `${baseUrl}assets/phase2/prehistoric_tileset.png`,
    { frameWidth: 32, frameHeight: 32, endFrame: 31 },
  );
  scene.load.json(
    PHASE2_METADATA,
    `${baseUrl}assets/phase2/prehistoric_tileset.json`,
  );
}

/** Call after loading. Animation keys are prefixed to avoid Phase 1 collisions. */
export function registerPhase2Animations(
  scene: Pick<Phaser.Scene, "cache" | "anims">,
) {
  const data = validatePhase2Art(scene.cache.json.get(PHASE2_METADATA));
  for (const animation of data.animations) {
    const key = `phase2-${animation.key}`;
    if (!scene.anims.exists(key))
      scene.anims.create({
        key,
        frames: animation.frames.map((frame) => ({
          key: PHASE2_TEXTURE,
          frame,
        })),
        frameRate: animation.frameRate,
        repeat: animation.repeat,
      });
  }
  return data;
}

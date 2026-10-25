export interface AsepriteAtlas {
  frames: {
    filename: string;
    frame: { x: number; y: number; w: number; h: number };
    rotated: boolean;
    trimmed: boolean;
    duration: number;
  }[];
  meta: {
    size: { w: number; h: number };
    frameTags: { name: string; from: number; to: number; direction: string }[];
  };
}

export const REQUIRED_TAGS = [
  ...["dog", "cat"].flatMap((actor) =>
    ["down", "up", "left", "right"].map((dir) => `${actor}-${dir}`),
  ),
  "grass",
  "wall",
  "crate",
  "house",
  "bone",
  "range",
  "bomb",
  "speed",
  "spark",
  "dust",
  "note",
  "shadow",
  "blast",
];

/** Validate the export contract before Phaser consumes frames/animation tags. */
export function validateAtlas(value: unknown): AsepriteAtlas {
  const atlas = value as AsepriteAtlas | undefined;
  if (
    !atlas ||
    !Array.isArray(atlas.frames) ||
    !Array.isArray(atlas.meta?.frameTags) ||
    !atlas.meta.size ||
    !(atlas.meta.size.w > 0) ||
    !(atlas.meta.size.h > 0)
  ) {
    throw new Error(
      "A arte precisa ser exportada como Aseprite JSON Array com Tags.",
    );
  }
  for (const [index, frame] of atlas.frames.entries()) {
    const box = frame.frame;
    if (
      frame.filename !== String(index) ||
      frame.rotated ||
      frame.trimmed ||
      !box ||
      box.w !== 24 ||
      box.h !== 24 ||
      !Number.isInteger(box.x) ||
      !Number.isInteger(box.y) ||
      box.x < 0 ||
      box.y < 0 ||
      box.x + box.w > atlas.meta.size.w ||
      box.y + box.h > atlas.meta.size.h ||
      !(frame.duration > 0)
    ) {
      throw new Error(
        `Frame ${index} inválido: use 24×24, nomes {frame}, sem trim ou rotação.`,
      );
    }
  }
  const tags = atlas.meta.frameTags;
  if (new Set(tags.map((tag) => tag.name)).size !== tags.length)
    throw new Error("Tags de animação duplicadas.");
  for (const name of REQUIRED_TAGS) {
    const tag = tags.find((item) => item.name === name);
    if (
      !tag ||
      !Number.isInteger(tag.from) ||
      !Number.isInteger(tag.to) ||
      tag.from < 0 ||
      tag.to < tag.from ||
      tag.to >= atlas.frames.length
    ) {
      throw new Error(`Tag ausente ou intervalo inválido: ${name}`);
    }
    if (name === "blast" && tag.to - tag.from < 3)
      throw new Error("A tag blast precisa de pelo menos 4 frames.");
  }
  return atlas;
}

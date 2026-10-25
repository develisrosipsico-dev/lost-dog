import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { PHASE2_FRAMES, validatePhase2Art } from "../src/art/phase2";
import { LEVELS } from "../src/game/levels";
interface Image {
  width: number;
  height: number;
  data: Buffer;
}
const { PNG } = createRequire(import.meta.url)("pngjs") as {
  PNG: { sync: { read: (bytes: Buffer) => Image } };
};
const directory = new URL("../public/assets/phase2/", import.meta.url);
const json = () =>
  JSON.parse(
    readFileSync(new URL("prehistoric_tileset.json", directory), "utf8"),
  );
const sheet = PNG.sync.read(
  readFileSync(new URL("prehistoric_tileset.png", directory)),
);
function pixels(index: number) {
  const result = Buffer.alloc(32 * 32 * 4),
    x = (index % 8) * 32,
    y = Math.floor(index / 8) * 32;
  for (let row = 0; row < 32; row++) {
    const start = ((y + row) * sheet.width + x) * 4;
    sheet.data.copy(result, row * 32 * 4, start, start + 32 * 4);
  }
  return result;
}

describe("Phase 2 visual assets", () => {
  it("keeps the studio, PNG and exported frame contract in sync", () => {
    const data = validatePhase2Art(json());
    const html = readFileSync(
      new URL("../arte_fase2_zelda.html", import.meta.url),
      "utf8",
    );
    const embedded = JSON.parse(
      html.match(
        /<script id="phase2-data" type="application\/json">([\s\S]*?)<\/script>/,
      )![1],
    );
    expect(embedded).toEqual(data);
    expect([sheet.width, sheet.height]).toEqual([data.width, data.height]);
    expect(Object.values(data.frames)).toEqual(
      Array.from({ length: 32 }, (_, i) => i),
    );
  });
  it("has visible pixels in all 32 frames and real alpha around standalone objects", () => {
    for (let frame = 0; frame < 32; frame++) {
      const bytes = pixels(frame);
      let visible = 0,
        transparent = 0;
      for (let index = 3; index < bytes.length; index += 4) {
        if (bytes[index] > 0) visible++;
        else transparent++;
      }
      expect(visible, `empty frame ${frame}`).toBeGreaterThan(0);
      if (frame <= 2) expect(transparent).toBe(0);
      else
        expect(
          transparent,
          `frame ${frame} should not include a background`,
        ).toBeGreaterThan(0);
    }
  });
  it("contains two genuinely different poses for each declared animation", () => {
    for (const animation of json().animations)
      expect(
        pixels(animation.frames[0]).equals(pixels(animation.frames[1])),
        animation.key,
      ).toBe(false);
    expect(
      pixels(PHASE2_FRAMES.bush).equals(pixels(PHASE2_FRAMES.bushCut)),
    ).toBe(false);
  });
  it("renders both halves of the cave, with a continuous opaque rock seam", () => {
    for (const index of [PHASE2_FRAMES.caveLeft, PHASE2_FRAMES.caveRight]) {
      const bytes = pixels(index);
      const edge = index === PHASE2_FRAMES.caveLeft ? 31 : 0;
      for (let y = 4; y < 32; y++)
        expect(bytes[(y * 32 + edge) * 4 + 3]).toBe(255);
    }
  });
  it("exports the 15×13 scenario at 480×416, with ground instead of a baked checkerboard", () => {
    const preview = PNG.sync.read(
      readFileSync(new URL("stage2_map_preview.png", directory)),
    );
    expect([preview.width, preview.height]).toEqual([480, 416]);
    for (let i = 3; i < preview.data.length; i += 4)
      if (preview.data[i] !== 255)
        throw new Error("Map background is unexpectedly transparent");
    const data = validatePhase2Art(json());
    expect(data.map.tiles[11][1]).toBe("W");
    expect(data.map.tiles[1][13]).toBe("C");
    expect(
      data.previewActors.find((actor) => actor.type === "trilobite")
        ?.hiddenUnderBush,
    ).toBe(true);
    const bug = data.previewActors.find((actor) => actor.type === "trilobite")!;
    expect(data.map.tiles[bug.row][bug.col]).toBe("B");
    let clearings = 0;
    for (let row = 1; row < 10; row++)
      for (let col = 1; col < 12; col++) {
        if (
          [0, 1, 2].every((dy) =>
            [0, 1, 2].every((dx) =>
              ".DWC".includes(data.map.tiles[row + dy][col + dx]),
            ),
          )
        )
          clearings++;
      }
    expect(clearings).toBeGreaterThan(0);
  });
  it("rejects incorrect frame layouts, animation indices and portal positions", () => {
    const wrong = json();
    wrong.frames.saberOrange0 = 33;
    expect(() => validatePhase2Art(wrong)).toThrow(/Índice/);
    const badAnimation = json();
    badAnimation.animations[0].frames = [8, 32];
    expect(() => validatePhase2Art(badAnimation)).toThrow(/Animação/);
    const badGoal = json();
    badGoal.map.goal.col = 12;
    expect(() => validatePhase2Art(badGoal)).toThrow(/Portal/);
  });
  it("keeps the playable campaign limited to the existing Phase 1 levels", () => {
    expect(LEVELS.map((level) => level.id)).toEqual(["1-1", "1-2", "1-3"]);
  });
});

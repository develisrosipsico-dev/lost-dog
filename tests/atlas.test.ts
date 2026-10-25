import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { REQUIRED_TAGS, validateAtlas } from "../src/game/atlas";

const exported = () =>
  JSON.parse(
    readFileSync(
      new URL("../public/assets/world.json", import.meta.url),
      "utf8",
    ),
  );

describe("Aseprite asset contract", () => {
  it("loads every required tag and frame from the checked-in PNG/JSON export", () => {
    const atlas = validateAtlas(exported());
    const png = readFileSync(
      new URL("../public/assets/world.png", import.meta.url),
    );
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(atlas.meta.size.w);
    expect(png.readUInt32BE(20)).toBe(atlas.meta.size.h);
    expect(atlas.meta.frameTags.map((tag) => tag.name)).toEqual(
      expect.arrayContaining(REQUIRED_TAGS),
    );
    for (const tag of atlas.meta.frameTags.filter((tag) =>
      /^(dog|cat)-(down|up|left|right)$/.test(tag.name),
    )) {
      expect(tag.to - tag.from + 1).toBeGreaterThanOrEqual(4);
    }
  });
  it("accepts higher-resolution artwork without changing the collision-grid size", () => {
    const atlas = exported();
    const old = atlas.frames[0].frame.w;
    const ratio = 128 / old;
    atlas.meta.size.w *= ratio;
    atlas.meta.size.h *= ratio;
    for (const frame of atlas.frames) {
      frame.frame.x *= ratio;
      frame.frame.y *= ratio;
      frame.frame.w = frame.frame.h = 128;
    }
    expect(validateAtlas(atlas).frames[0].frame.w).toBe(128);
    atlas.frames[1].frame.h = 24;
    expect(() => validateAtlas(atlas)).toThrow(/Frame/);
  });
  it("rejects missing animations, wrong filenames and trimmed frames", () => {
    const noDog = exported();
    noDog.meta.frameTags.shift();
    expect(() => validateAtlas(noDog)).toThrow(/Tag/);
    const named = exported();
    named.frames[0].filename = "dog-down-0";
    expect(() => validateAtlas(named)).toThrow(/Frame/);
    const trimmed = exported();
    trimmed.frames[0].trimmed = true;
    expect(() => validateAtlas(trimmed)).toThrow(/Frame/);
  });
  it("ships a valid native RGBA Aseprite document with editable cels for every exported frame", () => {
    const data = readFileSync(
      new URL("../art/world.aseprite", import.meta.url),
    );
    const atlas = validateAtlas(exported());
    expect(data.readUInt32LE(0)).toBe(data.length);
    expect(data.readUInt16LE(4)).toBe(0xa5e0);
    expect(data.readUInt16LE(6)).toBe(atlas.frames.length);
    const frameSize = atlas.frames[0].frame.w;
    expect(data.readUInt16LE(8)).toBe(frameSize);
    expect(data.readUInt16LE(10)).toBe(frameSize);
    expect(data.readUInt16LE(12)).toBe(32);
    let cursor = 128;
    let cels = 0;
    let tags = 0;
    while (cursor < data.length) {
      const end = cursor + data.readUInt32LE(cursor);
      expect(data.readUInt16LE(cursor + 4)).toBe(0xf1fa);
      const chunks = data.readUInt16LE(cursor + 6);
      cursor += 16;
      for (let i = 0; i < chunks; i++) {
        const size = data.readUInt32LE(cursor);
        const type = data.readUInt16LE(cursor + 4);
        if (type === 0x2005) {
          expect(data.readUInt16LE(cursor + 13)).toBe(2); // compressed cel
          expect(
            inflateSync(data.subarray(cursor + 26, cursor + size)),
          ).toHaveLength(frameSize * frameSize * 4);
          cels++;
        }
        if (type === 0x2018) tags = data.readUInt16LE(cursor + 6);
        cursor += size;
      }
      expect(cursor).toBe(end);
    }
    expect(cels).toBe(atlas.frames.length);
    expect(tags).toBe(atlas.meta.frameTags.length);
  });
});

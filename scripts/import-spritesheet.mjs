/** Package a reference PNG sheet as Phaser metadata + editable Aseprite.
 * Pixel bytes are copied unchanged: no resizing, retouching or runtime generation.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { PNG } from "pngjs";
import { contentBounds, addPresentation } from "./atlas-presentation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const input = resolve(
  process.argv[2] ?? resolve(root, "art/reference-sheet.png"),
);
const image = PNG.sync.read(readFileSync(input));
const layout = JSON.parse(
  readFileSync(resolve(root, "art/reference-layout.json"), "utf8"),
);
if (image.width !== layout.sourceWidth || image.height !== layout.sourceWidth) {
  throw new Error(
    "O PNG não corresponde a art/reference-layout.json. Ajuste os recortes antes de importar.",
  );
}
const size = layout.frameSize;
const packed = new PNG({ width: size * 8, height: size * 8 });
const sourceRects = Array.from({ length: 64 }, (_, index) => {
  const sourceIndex = layout.sourceFrames[String(index)] ?? index;
  const col = sourceIndex % 8,
    row = Math.floor(sourceIndex / 8);
  return (
    layout.rectangles[String(sourceIndex)] ?? {
      x: layout.columns[col],
      y: layout.rows[row],
      w: layout.columns[col + 1] - layout.columns[col],
      h: layout.rows[row + 1] - layout.rows[row],
    }
  );
});
for (const [index, rect] of sourceRects.entries()) {
  const bounds = contentBounds(image, rect);
  if (bounds.w > size || bounds.h > size - 12)
    throw new Error(
      `Sprite ${index} não cabe no frame: ${bounds.w}×${bounds.h}`,
    );
  const x = Math.floor((size - bounds.w) / 2);
  const y =
    index < 32 || (index >= 48 && index < 60)
      ? size - 12 - bounds.h
      : Math.floor((size - bounds.h) / 2);
  for (let row = 0; row < bounds.h; row++) {
    const from =
      ((rect.y + bounds.y + row) * image.width + rect.x + bounds.x) * 4;
    const to =
      ((Math.floor(index / 8) * size + y + row) * packed.width +
        (index % 8) * size +
        x) *
      4;
    image.data.copy(packed.data, to, from, from + bounds.w * 4);
  }
}
const tags = [];
let index = 0;
function tag(name, count = 1) {
  tags.push({
    name,
    from: index,
    to: index + count - 1,
    direction: "forward",
    repeat: 0,
  });
  index += count;
}
for (const actor of ["dog", "cat"]) {
  for (const direction of ["down", "up", "left", "right"])
    tag(`${actor}-${direction}`, 4);
}
for (const name of [
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
])
  tag(name);
tag("blast", 4);
for (const coat of ["orange", "siamese", "calico"]) {
  for (const direction of ["down", "up", "left", "right"])
    tag(`cat-${coat}-${direction}`);
}
for (const name of ["grass-flowers", "fence", "brick", "bush"]) tag(name);
if (index !== 64) throw new Error("O mapa de tags deve cobrir as 64 células.");
const frames = Array.from({ length: 64 }, (_, frame) => ({
  filename: String(frame),
  frame: {
    x: (frame % 8) * size,
    y: Math.floor(frame / 8) * size,
    w: size,
    h: size,
  },
  rotated: false,
  trimmed: false,
  spriteSourceSize: { x: 0, y: 0, w: size, h: size },
  sourceSize: { w: size, h: size },
  duration: 120,
}));
const json = {
  frames,
  meta: {
    app: "Lost Dog — illustrated spritesheet, packaged for Aseprite/Phaser",
    version: "2",
    image: "world.png",
    format: "RGBA8888",
    size: { w: packed.width, h: packed.height },
    scale: "1",
    frameTags: tags,
    layers: [
      {
        name: "Reference-inspired pixel art",
        opacity: 255,
        blendMode: "normal",
      },
    ],
  },
};

const u16 = (value) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(value);
  return b;
};
const u32 = (value) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(value);
  return b;
};
const str = (value) => {
  const b = Buffer.from(value);
  return Buffer.concat([u16(b.length), b]);
};
const chunk = (type, data) =>
  Buffer.concat([u32(data.length + 6), u16(type), data]);
const layerInfo = Buffer.alloc(16);
layerInfo.writeUInt16LE(1);
layerInfo[12] = 255;
const layer = chunk(
  0x2004,
  Buffer.concat([layerInfo, str("Reference-inspired pixel art")]),
);
const tagChunks = tags.map((tag) => {
  const data = Buffer.alloc(17);
  data.writeUInt16LE(tag.from);
  data.writeUInt16LE(tag.to, 2);
  data[13] = 225;
  data[14] = 155;
  data[15] = 88;
  return Buffer.concat([data, str(tag.name)]);
});
const tagsChunk = chunk(
  0x2018,
  Buffer.concat([u16(tags.length), Buffer.alloc(8), ...tagChunks]),
);
const aseFrames = frames.map((frame, index) => {
  const rgba = Buffer.alloc(size * size * 4);
  for (let row = 0; row < size; row++) {
    const offset = ((frame.frame.y + row) * packed.width + frame.frame.x) * 4;
    packed.data.copy(rgba, row * size * 4, offset, offset + size * 4);
  }
  const celInfo = Buffer.alloc(20);
  celInfo[6] = 255;
  celInfo.writeUInt16LE(2, 7);
  celInfo.writeUInt16LE(size, 16);
  celInfo.writeUInt16LE(size, 18);
  const cel = chunk(0x2005, Buffer.concat([celInfo, deflateSync(rgba)]));
  const chunks = index === 0 ? [layer, tagsChunk, cel] : [cel];
  const payload = Buffer.concat(chunks);
  const header = Buffer.alloc(16);
  header.writeUInt32LE(payload.length + 16);
  header.writeUInt16LE(0xf1fa, 4);
  header.writeUInt16LE(chunks.length, 6);
  header.writeUInt16LE(120, 8);
  header.writeUInt32LE(chunks.length, 12);
  return Buffer.concat([header, payload]);
});
const body = Buffer.concat(aseFrames);
const header = Buffer.alloc(128);
header.writeUInt32LE(body.length + 128);
header.writeUInt16LE(0xa5e0, 4);
header.writeUInt16LE(64, 6);
header.writeUInt16LE(size, 8);
header.writeUInt16LE(size, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(1, 14);
header.writeUInt16LE(120, 18);
header[34] = 1;
header[35] = 1;
header.writeUInt16LE(size, 40);
header.writeUInt16LE(size, 42);
writeFileSync(
  resolve(root, "art/world.aseprite"),
  Buffer.concat([header, body]),
);
const pngBytes = PNG.sync.write(packed);
addPresentation(json, pngBytes, layout);
writeFileSync(
  resolve(root, "public/assets/world.json"),
  JSON.stringify(json, null, 2) + "\n",
);
const output = resolve(root, "public/assets/world.png");
writeFileSync(output, pngBytes);
console.log(
  `Packaged 64 ${size}×${size} frames, ${tags.length} tags; sprite pixels preserved without resampling.`,
);

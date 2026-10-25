import { PNG } from "pngjs";

export function contentBounds(image, rectangle) {
  let left = rectangle.w,
    top = rectangle.h,
    right = -1,
    bottom = -1;
  for (let y = 0; y < rectangle.h; y++)
    for (let x = 0; x < rectangle.w; x++) {
      if (
        image.data[
          ((rectangle.y + y) * image.width + rectangle.x + x) * 4 + 3
        ] < 128
      )
        continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  if (right < left) throw new Error("A célula está vazia ou fora da imagem.");
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

export function addPresentation(atlas, pngBytes, layout) {
  const image = PNG.sync.read(pngBytes);
  atlas.meta.contentBounds = Object.fromEntries(
    atlas.frames.map((frame, index) => [
      String(index),
      contentBounds(image, frame.frame),
    ]),
  );
  atlas.meta.mirrorXTags = layout.mirrorXTags;
  return atlas;
}

import { readFileSync, writeFileSync } from "node:fs";
import { addPresentation } from "./atlas-presentation.mjs";
const file = new URL("../public/assets/world.json", import.meta.url);
const atlas = JSON.parse(readFileSync(file, "utf8"));
const image = readFileSync(
  new URL("../public/assets/world.png", import.meta.url),
);
const layout = JSON.parse(
  readFileSync(
    new URL("../art/reference-layout.json", import.meta.url),
    "utf8",
  ),
);
addPresentation(atlas, image, layout);
writeFileSync(file, JSON.stringify(atlas, null, 2) + "\n");
console.log("Limites visuais e direções espelhadas atualizados.");

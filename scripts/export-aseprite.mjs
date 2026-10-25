import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync } from "node:fs";

const root = fileURLToPath(new URL("../", import.meta.url));
mkdirSync(new URL("../public/assets/", import.meta.url), { recursive: true });
const result = spawnSync(
  process.env.ASEPRITE_BIN || "aseprite",
  [
    "-b",
    "art/world.aseprite",
    "--format",
    "json-array",
    "--sheet-type",
    "horizontal",
    "--filename-format",
    "{frame}",
    "--sheet",
    "public/assets/world.png",
    "--data",
    "public/assets/world.json",
  ],
  { cwd: root, stdio: "inherit" },
);
if (result.error) {
  console.error(
    "Aseprite não encontrado. Instale-o ou defina ASEPRITE_BIN com o caminho do executável. Os PNG/JSON já incluídos continuam disponíveis.",
  );
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
const atlas = JSON.parse(
  readFileSync(new URL("../public/assets/world.json", import.meta.url), "utf8"),
);
if (!Array.isArray(atlas.frames) || !atlas.meta?.frameTags?.length) {
  throw new Error(
    "A exportação precisa de JSON Array e frame tags. Consulte art/README.md.",
  );
}
console.log("Spritesheet e animações exportadas para public/assets/.");

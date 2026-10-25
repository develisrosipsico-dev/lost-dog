import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        game: fileURLToPath(new URL("./index.html", import.meta.url)),
        phase2Art: fileURLToPath(
          new URL("./arte_fase2_zelda.html", import.meta.url),
        ),
      },
    },
  },
});

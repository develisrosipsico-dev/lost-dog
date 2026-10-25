import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { WIDTH, HEIGHT } from "./game/constants";

export let game: Phaser.Game;

// No runtime texture generation: all frames and animation tags come from Aseprite.
async function boot() {
  await document.fonts.load('10px "Press Start 2P"');
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: WIDTH,
    height: HEIGHT,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#386449",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [GameScene],
    input: { activePointers: 3 },
  });
}

void boot().catch((error) => {
  console.error(error);
  const title = document.getElementById("overlay-title");
  if (title) title.textContent = "NÃO FOI POSSÍVEL INICIAR O JOGO";
});

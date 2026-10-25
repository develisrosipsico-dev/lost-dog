import Phaser from "phaser";
import { RetroAudioEngine } from "../game/Audio";
import { GameModel } from "../game/GameModel";
import { validateAtlas } from "../game/atlas";
import type { AsepriteAtlas } from "../game/atlas";
import { COLS, ROWS, TILE_SIZE, WIDTH, HEIGHT, TILE } from "../game/constants";

const element = (id: string) => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Elemento de interface ausente: ${id}`);
  return node;
};

/** Phaser owns loading, animation, input, display objects and the game loop.
 * Collision remains a deterministic grid simulation, avoiding Arcade separation
 * changing the original Bomberman corner-sliding behavior.
 */
export class GameScene extends Phaser.Scene {
  readonly audio = new RetroAudioEngine();
  readonly model = new GameModel(this.audio);
  private objects = new Map<object, Phaser.GameObjects.Sprite>();
  private labels = new Map<object, Phaser.GameObjects.Text>();
  private terrain: (Phaser.GameObjects.Image | undefined)[] = [];
  private tileTypes: number[] = [];
  private cleanup: (() => void)[] = [];
  private accumulator = 0;
  private lastState = "";
  private helpOpen = false;
  private hidden = false;
  private ready = false;
  private artScale = 2;
  private mirrorXTags = new Set<string>();

  constructor() {
    super("Game");
  }

  preload() {
    this.load.aseprite(
      "world",
      `${import.meta.env.BASE_URL}assets/world.png`,
      `${import.meta.env.BASE_URL}assets/world.json`,
    );
    this.load.on("loaderror", () => {
      element("overlay-title").textContent = "NÃO FOI POSSÍVEL CARREGAR A ARTE";
      element("overlay-desc").textContent =
        "Recarregue a página e confira os arquivos public/assets/world.png e world.json.";
    });
  }

  create() {
    if (!this.textures.exists("world")) return;
    let atlas: AsepriteAtlas;
    try {
      atlas = validateAtlas(this.cache.json.get("world"));
    } catch (error) {
      element("overlay-title").textContent = "EXPORTAÇÃO DE ARTE INVÁLIDA";
      element("overlay-desc").textContent =
        error instanceof Error
          ? error.message
          : "Confira as instruções em art/README.md.";
      return;
    }
    this.artScale = TILE_SIZE / atlas.frames[0].frame.w;
    this.mirrorXTags = new Set(atlas.meta.mirrorXTags ?? []);
    const texture = this.textures.get("world");
    for (const tag of atlas.meta.frameTags) {
      for (let index = tag.from; index <= tag.to; index++) {
        const { x, y, w, h } = atlas.frames[index].frame;
        const bounds = atlas.meta.contentBounds?.[String(index)];
        const crop =
          bounds &&
          [
            "grass",
            "grass-flowers",
            "wall",
            "crate",
            "house",
            "fence",
            "brick",
            "bush",
          ].includes(tag.name);
        texture.add(
          `${tag.name}-${index - tag.from}`,
          0,
          x + (crop ? bounds.x : 0),
          y + (crop ? bounds.y : 0),
          crop ? bounds.w : w,
          crop ? bounds.h : h,
        );
      }
    }
    for (const animation of this.anims.createFromAseprite("world")) {
      if (animation.key.startsWith("dog-") || animation.key.startsWith("cat-"))
        animation.repeat = -1;
    }
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const flowered =
          (row * 7 + col * 11) % 13 === 0 && texture.has("grass-flowers-0");
        this.add
          .image(
            col * TILE_SIZE + 24,
            row * TILE_SIZE + 24,
            "world",
            flowered ? "grass-flowers-0" : "grass-0",
          )
          .setDisplaySize(TILE_SIZE, TILE_SIZE)
          .setDepth(-1);
      }
    }
    this.bindInput();
    this.ready = true;
    element("btn-start").textContent = "INICIAR AVENTURA";
    (element("btn-start") as HTMLButtonElement).disabled = false;
    this.renderWorld();
    this.updateHud();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup.forEach((dispose) => dispose());
      this.cleanup = [];
      this.audio.stopBGM();
      if (this.audio.ctx) void this.audio.ctx.close();
    });
  }

  private listen(target: EventTarget, type: string, listener: EventListener) {
    target.addEventListener(type, listener);
    this.cleanup.push(() => target.removeEventListener(type, listener));
  }

  private setPaused() {
    this.model.paused = this.helpOpen || this.hidden;
    this.model.resetInput();
    this.accumulator = 0;
    if (this.model.paused) this.audio.stopBGM();
    else if (this.model.state === "PLAYING") this.audio.startBGM();
  }

  private bindInput() {
    this.listen(window, "keydown", (event) => {
      const e = event as KeyboardEvent;
      if (e.code in this.model.keys || e.code === "Space") e.preventDefault();
      if (this.model.paused) return;
      if (e.code in this.model.keys) this.model.keys[e.code] = true;
      if (e.code === "Space" && !e.repeat) this.model.dropBoneBomb();
    });
    this.listen(window, "keyup", (event) => {
      const e = event as KeyboardEvent;
      if (e.code in this.model.keys) this.model.keys[e.code] = false;
    });
    this.listen(window, "blur", () => {
      this.hidden = true;
      this.setPaused();
    });
    this.listen(window, "focus", () => {
      this.hidden = document.hidden;
      this.setPaused();
    });
    this.listen(document, "visibilitychange", () => {
      this.hidden = document.hidden;
      this.setPaused();
    });

    for (const [id, code] of Object.entries({
      "btn-up": "ArrowUp",
      "btn-down": "ArrowDown",
      "btn-left": "ArrowLeft",
      "btn-right": "ArrowRight",
    })) {
      const button = element(id);
      const held = new Set<number>();
      this.listen(button, "pointerdown", (event) => {
        const e = event as PointerEvent;
        e.preventDefault();
        if (this.model.paused) return;
        held.add(e.pointerId);
        button.setPointerCapture(e.pointerId);
        this.model.keys[code] = true;
      });
      const release: EventListener = (event) => {
        held.delete((event as PointerEvent).pointerId);
        if (held.size === 0) this.model.keys[code] = false;
      };
      this.listen(button, "pointerup", release);
      this.listen(button, "pointercancel", release);
      this.listen(button, "lostpointercapture", release);
    }
    this.listen(element("btn-bark"), "pointerdown", (event) => {
      event.preventDefault();
      this.model.dropBoneBomb();
    });
    this.listen(element("btn-start"), "click", () => {
      this.audio.init();
      this.audio.startBGM();
      this.helpOpen = false;
      this.hidden = false;
      this.model.startNewGame();
      this.accumulator = 0;
      this.tileTypes = [];
      element("help-modal").classList.add("hidden");
      element("game-overlay").classList.add("hidden");
    });
    this.listen(element("btn-bgm"), "click", () => {
      const on = this.audio.toggleBGM();
      element("bgm-icon").textContent = on ? "🎵" : "🔇";
      if (this.model.paused) this.audio.stopBGM();
    });
    this.listen(element("btn-sfx"), "click", () => {
      element("sfx-icon").textContent = this.audio.toggleSFX() ? "🔊" : "🔈";
    });
    this.listen(element("btn-crt"), "click", () =>
      element("crt-layer").classList.toggle("hidden"),
    );
    this.listen(element("btn-help"), "click", () => {
      this.helpOpen = true;
      element("help-modal").classList.remove("hidden");
      this.setPaused();
    });
    this.listen(element("btn-close-help"), "click", () => {
      this.helpOpen = false;
      element("help-modal").classList.add("hidden");
      this.setPaused();
    });
  }

  update(_time: number, delta: number) {
    if (!this.ready) return;
    // At most six simulation ticks after a slow frame; no tunnelling through tiles.
    this.accumulator += Math.min(delta / 1000, 0.1);
    while (this.accumulator + 1e-9 >= 1 / 60) {
      this.model.update(1 / 60);
      this.accumulator -= 1 / 60;
    }
    this.renderWorld();
    this.updateHud();
    if (this.model.screenShake > 0 && !this.model.paused) {
      this.cameras.main.shake(45, this.model.screenShake / WIDTH / 3, false);
    }
  }

  private renderWorld() {
    const model = this.model;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const index = row * COLS + col;
        const type = model.grid[row][col];
        if (this.tileTypes[index] === type) continue;
        this.tileTypes[index] = type;
        this.terrain[index]?.destroy();
        this.terrain[index] = undefined;
        const name =
          type === TILE.WALL_SOLID
            ? "wall"
            : type === TILE.BOX_CRATE
              ? "crate"
              : type === TILE.GOAL_HOUSE
                ? "house"
                : null;
        if (name)
          this.terrain[index] = this.add
            .image(
              col * TILE_SIZE + 24,
              row * TILE_SIZE + 24,
              "world",
              `${name}-0`,
            )
            .setDisplaySize(TILE_SIZE, TILE_SIZE)
            .setDepth(row * TILE_SIZE + 24);
      }
    }
    const seen = new Set<object>();
    const sprite = (
      owner: object,
      frame: string,
      x: number,
      y: number,
      depth = y,
    ) => {
      seen.add(owner);
      let object = this.objects.get(owner);
      if (!object) {
        object = this.add.sprite(x, y, "world", frame).setScale(this.artScale);
        this.objects.set(owner, object);
      }
      object.setPosition(x, y).setDepth(depth).setVisible(true);
      return object;
    };
    if (model.state !== "START") {
      const player = model.player;
      const dog = sprite(player, `dog-${player.facing}-0`, player.x, player.y);
      if (player.isMoving && model.state === "PLAYING" && !model.paused)
        dog.play(`dog-${player.facing}`, true);
      else {
        dog.stop();
        dog.setFrame(`dog-${player.facing}-0`);
      }
      dog.setAlpha(
        player.invulnerableTimer > 0 && Math.floor(model.globalTimer * 12) % 2
          ? 0.35
          : 1,
      );
    }
    const coats = ["cat", "cat-orange", "cat-siamese", "cat-calico"];
    for (const [index, cat] of model.enemies.entries()) {
      if (cat.alive) {
        const variant = `${coats[index % coats.length]}-${cat.dir}`;
        const animation = this.anims.exists(variant)
          ? variant
          : `cat-${cat.dir}`;
        const actor = sprite(cat, `${animation}-0`, cat.x, cat.y);
        actor.setFlipX(this.mirrorXTags.has(animation));
        if (model.state === "PLAYING" && !model.paused)
          actor.play(animation, true);
        else actor.stop();
      }
    }
    for (const bone of model.activeBombs) {
      sprite(bone, "bone-0", bone.x, bone.y).setScale(
        this.artScale * (1 + Math.sin(model.globalTimer * 16) * 0.075),
      );
    }
    for (const powerup of model.powerups) {
      sprite(
        powerup,
        `${powerup.type}-0`,
        powerup.x,
        powerup.y + Math.sin(powerup.anim) * 3,
      );
    }
    for (const blast of model.activeExplosions) {
      const frame = Math.min(
        3,
        Math.floor((1 - blast.life / blast.maxLife) * 4),
      );
      sprite(
        blast,
        `blast-${frame}`,
        blast.col * TILE_SIZE + 24,
        blast.row * TILE_SIZE + 24,
        HEIGHT + 1,
      )
        .setFrame(`blast-${frame}`)
        .setAlpha(blast.life / blast.maxLife);
    }
    // Preserve the original velocities, gravity, lifetime and particle types.
    // Phaser sprites are reused by particle identity rather than redrawn on Canvas.
    for (const particle of model.particles) {
      const color = Phaser.Display.Color.ValueToColor(particle.color);
      const frame =
        particle.type === "note"
          ? "note-0"
          : particle.type === "dust"
            ? "dust-0"
            : "spark-0";
      sprite(particle, frame, particle.x, particle.y, HEIGHT + 2)
        .setDisplaySize(particle.size * 2, particle.size * 2)
        .setTint(color.color)
        .setAlpha(Math.min(1, particle.life * 3) * color.alphaGL);
    }
    for (const [owner, object] of this.objects) {
      if (!seen.has(owner)) {
        object.destroy();
        this.objects.delete(owner);
      }
    }
    const texts = new Set<object>(model.floatingTexts);
    for (const text of model.floatingTexts) {
      let label = this.labels.get(text);
      if (!label) {
        label = this.add
          .text(text.x, text.y, text.text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "10px",
            color: text.color,
            stroke: "#17121e",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(HEIGHT + 3);
        this.labels.set(text, label);
      }
      label
        .setPosition(text.x, text.y)
        .setAlpha(Math.min(1, (text.life / text.maxLife) * 1.5));
    }
    for (const [owner, label] of this.labels) {
      if (!texts.has(owner)) {
        label.destroy();
        this.labels.delete(owner);
      }
    }
  }

  private updateHud() {
    const model = this.model;
    element("hud-lives").textContent =
      "❤️".repeat(Math.max(0, model.player.lives)) || "💀";
    element("hud-range").textContent = String(model.player.bombRange);
    element("hud-bombs").textContent = String(model.player.maxBombs);
    element("hud-speed").textContent = `${model.player.speedLevel}x`;
    element("hud-time").textContent = `${model.timeLeft}s`;
    if (this.lastState === model.state) return;
    this.lastState = model.state;
    if (model.state !== "VICTORY" && model.state !== "GAMEOVER") return;
    const won = model.state === "VICTORY";
    element("overlay-icon").textContent = won ? "🐶🏡" : "🌧️🐾";
    element("overlay-title").textContent = won
      ? "DOCE LAR ALCANÇADO!"
      : "AINDA PERDIDO...";
    element("overlay-desc").textContent = won
      ? `O cãozinho chegou à sua casinha! Tempo restante: ${model.timeLeft} segundos.`
      : `${model.reason} Não desista! Sua casinha continua esperando no canto superior direito.`;
    element("btn-start").textContent = won
      ? "JOGAR NOVAMENTE"
      : "TENTAR NOVAMENTE";
    element("game-overlay").classList.remove("hidden");
  }
}

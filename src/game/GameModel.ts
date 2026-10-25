import {
  createBaseGrid,
  generateLevel,
  levelDefinition,
  LEVELS,
  cellKey,
} from "./levels";
import type { LevelId } from "./levels";
import {
  COLS,
  ROWS,
  TILE_SIZE,
  TILE,
  POWERUP,
  PLAYER_SPEED,
  BONE_FUSE,
} from "./constants";
import type {
  Position,
  Direction,
  Player,
  Cat,
  Bomb,
  Explosion,
  Particle,
  FloatingText,
  Powerup,
  PowerupKind,
  GameState,
} from "./types";

export interface SoundEffects {
  playSqueak(): void;
  playSonicBark(): void;
  playPowerup(): void;
  playCatMeow(): void;
  playHurt(): void;
  playVictory(): void;
}
const silentAudio: SoundEffects = {
  playSqueak() {},
  playSonicBark() {},
  playPowerup() {},
  playCatMeow() {},
  playHurt() {},
  playVictory() {},
};

/** Pure 15×13 game simulation. Phaser owns the fixed timestep and rendering. */
export class GameModel {
  state: GameState = "START";
  paused = false;
  reason = "";
  globalTimer = 0;
  levelId: LevelId = "1-1";
  levelSeed = 0;
  hiddenRewards: Record<string, PowerupKind> = {};
  timeLeft = 120;
  timerElapsed = 0;
  screenShake = 0;
  grid: number[][] = [];
  powerups: Powerup[] = [];
  activeBombs: Bomb[] = [];
  activeExplosions: Explosion[] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];
  enemies: Cat[] = [];
  player: Player = {
    x: 72,
    y: 552,
    size: 34,
    speed: PLAYER_SPEED,
    speedLevel: 1,
    lives: 3,
    maxBombs: 1,
    bombRange: 1,
    facing: "down",
    isMoving: false,
    walkCycle: 0,
    dustTimer: 0,
    invulnerableTimer: 0,
  };
  keys: Record<string, boolean> = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
  };

  constructor(
    public readonly audio: SoundEffects = silentAudio,
    private readonly random = Math.random,
  ) {
    this.initGrid();
  }

  resetInput() {
    for (const key of Object.keys(this.keys)) this.keys[key] = false;
  }

  get level() {
    return levelDefinition(this.levelId);
  }
  get nextLevel() {
    return LEVELS[LEVELS.findIndex((level) => level.id === this.levelId) + 1];
  }

  initGrid() {
    this.grid = createBaseGrid();
  }

  restartLevel() {
    this.startNewGame(this.levelId, this.levelSeed);
  }

  advanceLevel() {
    if (this.state !== "VICTORY" || !this.nextLevel) return false;
    this.startNewGame(this.nextLevel.id, this.levelSeed);
    return true;
  }

  startNewGame(
    levelId: LevelId = this.levelId,
    seed = Math.floor(this.random() * 4294967296),
  ) {
    const generated = generateLevel(levelId, seed);
    this.levelId = levelId;
    this.levelSeed = generated.seed;
    this.grid = generated.grid;
    this.hiddenRewards = { ...generated.rewards };
    this.state = "PLAYING";

    // Posiciona cachorrinho no canto inferior esquerdo (1, 11)
    this.player.x = 1 * TILE_SIZE + TILE_SIZE / 2;
    this.player.y = (ROWS - 2) * TILE_SIZE + TILE_SIZE / 2;
    this.player.speed = PLAYER_SPEED;
    this.player.speedLevel = 1;
    this.player.lives = 3;
    this.player.maxBombs = 1;
    this.player.bombRange = 1;
    this.player.facing = "right";
    this.player.invulnerableTimer = 0;

    this.activeBombs = [];
    this.activeExplosions = [];
    this.particles = [];
    this.floatingTexts = [];
    this.powerups = [];
    this.enemies = [];

    this.spawnAlleyCats();
    this.timeLeft = this.level.time;
    this.timerElapsed = 0;
    this.globalTimer = 0;
    this.screenShake = 0;
    this.player.walkCycle = 0;
    this.player.dustTimer = 0;
    this.player.isMoving = false;
    this.reason = "";
    this.paused = false;
    this.resetInput();
    this.spawnFloatingText(
      this.player.x,
      this.player.y - 20,
      "VAMOS PRA CASA!",
      "#fef08a",
    );
  }

  spawnAlleyCats() {
    this.enemies = this.level.cats.map((spawn) => ({
      x: spawn.col * TILE_SIZE + TILE_SIZE / 2,
      y: spawn.row * TILE_SIZE + TILE_SIZE / 2,
      size: 30,
      speed: spawn.speed,
      dir: spawn.dir,
      breed: spawn.breed,
      behavior: spawn.behavior,
      animTime: 0,
      alive: true,
      target: null,
    }));
  }

  spawnFloatingText(x: number, y: number, text: string, color = "#fbbf24") {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      vy: -38,
      life: 1.15,
      maxLife: 1.15,
    });
  }

  // Soltar Osso Apitador
  dropBoneBomb() {
    if (this.state !== "PLAYING" || this.paused) return;
    const col = Math.floor(this.player.x / TILE_SIZE);
    const row = Math.floor(this.player.y / TILE_SIZE);

    if (this.activeBombs.some((b) => b.col === col && b.row === row)) return;
    if (this.activeBombs.length >= this.player.maxBombs) return;

    this.activeBombs.push({
      col,
      row,
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
      timer: BONE_FUSE,
      maxTimer: BONE_FUSE,
      range: this.player.bombRange,
      noteTimer: 0,
      playerCanExit: true,
    });

    this.audio.playSqueak();
  }

  // Detonação Sônica em Cruz
  detonateBone(bomb: Bomb) {
    this.audio.playSonicBark();
    this.screenShake = 8;

    const cCol = bomb.col;
    const cRow = bomb.row;
    const range = bomb.range;

    this.addExplosionCell(cCol, cRow, "center", 0);
    this.spawnFloatingText(bomb.x, bomb.y - 10, "AU! AU!", "#38bdf8");

    // Verifica outros ossos na mesma coordenada ou alcance (reação em cadeia)
    const dirs = [
      { dx: 0, dy: -1, dirName: "up" },
      { dx: 0, dy: 1, dirName: "down" },
      { dx: -1, dy: 0, dirName: "left" },
      { dx: 1, dy: 0, dirName: "right" },
    ];

    dirs.forEach((d) => {
      for (let step = 1; step <= range; step++) {
        const nc = cCol + d.dx * step;
        const nr = cRow + d.dy * step;

        if (this.grid[nr][nc] === TILE.WALL_SOLID) break;

        // Reação em cadeia se atingir outro osso
        const otherBomb = this.activeBombs.find(
          (b) => b.col === nc && b.row === nr && b.timer > 0.05,
        );
        if (otherBomb) {
          otherBomb.timer = 0.04;
        }

        if (this.grid[nr][nc] === TILE.GOAL_HOUSE) {
          this.addExplosionCell(nc, nr, d.dirName, step === range);
          break;
        }

        if (this.grid[nr][nc] === TILE.BOX_CRATE) {
          this.destroyCrate(nc, nr);
          this.addExplosionCell(nc, nr, d.dirName, true);
          break;
        }

        this.addExplosionCell(nc, nr, d.dirName, step === range);
      }
    });
  }

  addExplosionCell(
    col: number,
    row: number,
    dirType: string,
    isTip: number | boolean,
  ) {
    this.activeExplosions.push({
      col,
      row,
      dirType,
      isTip,
      life: 0.45,
      maxLife: 0.45,
    });

    const cx = col * TILE_SIZE + TILE_SIZE / 2;
    const cy = row * TILE_SIZE + TILE_SIZE / 2;

    for (let i = 0; i < 6; i++) {
      const angle = this.random() * Math.PI * 2;
      const spd = 40 + this.random() * 90;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 20,
        gravity: 120,
        color: this.random() > 0.4 ? "#38bdf8" : "#fef08a",
        size: this.random() * 4 + 2,
        life: 0.35 + this.random() * 0.2,
        type: "spark",
      });
    }
  }

  destroyCrate(col: number, row: number) {
    if (this.grid[row]?.[col] !== TILE.BOX_CRATE) return;
    this.grid[row][col] = TILE.EMPTY;
    const cx = col * TILE_SIZE + TILE_SIZE / 2;
    const cy = row * TILE_SIZE + TILE_SIZE / 2;

    // Farpas de madeira e pedaços de papelão voando com gravidade
    for (let i = 0; i < 16; i++) {
      const angle = this.random() * Math.PI * 2;
      const spd = 50 + this.random() * 110;
      this.particles.push({
        x: cx + (this.random() - 0.5) * 16,
        y: cy + (this.random() - 0.5) * 16,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 70,
        gravity: 280,
        color: ["#d97706", "#b45309", "#fef08a", "#78350f"][i % 4],
        size: 4 + this.random() * 4,
        life: 0.5 + this.random() * 0.25,
        type: "splinter",
      });
    }

    // Nuvem de poeira
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: cx + (this.random() - 0.5) * 20,
        y: cy + (this.random() - 0.5) * 20,
        vx: (this.random() - 0.5) * 30,
        vy: -15 - this.random() * 20,
        gravity: -10,
        color: "rgba(226, 232, 240, 0.7)",
        size: 8 + this.random() * 6,
        life: 0.4,
        type: "dust",
      });
    }

    const rewardKey = cellKey({ col, row });
    const guaranteed = this.hiddenRewards[rewardKey];
    delete this.hiddenRewards[rewardKey];
    // Reward alcoves always pay out. Other crates keep the original random drops.
    if (guaranteed || this.random() < 0.44) {
      const r = this.random();
      const type: PowerupKind =
        guaranteed ??
        (r < 0.36
          ? POWERUP.RANGE
          : r < 0.72
            ? POWERUP.BOMB_COUNT
            : POWERUP.SPEED);

      this.powerups.push({
        col,
        row,
        x: cx,
        y: cy,
        type,
        anim: 0,
      });
    }
  }

  /**
   * ============================================================================
   * 4. ATUALIZAÇÃO DE FÍSICA, CORNER-SLIDING E IA
   * ============================================================================
   */
  update(dt: number) {
    if (this.paused) return;
    this.globalTimer += dt;

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    if (this.state !== "PLAYING" || this.paused) return;

    this.timerElapsed += dt;
    while (this.timerElapsed >= 1) {
      this.timerElapsed -= 1;
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.triggerGameOver("A noite caiu e o tempo acabou!");
        return;
      }
    }

    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }

    // Leitura de Inputs do Cachorrinho
    let dx = 0,
      dy = 0;
    if (this.keys.ArrowUp || this.keys.KeyW) {
      dy -= 1;
      this.player.facing = "up";
    }
    if (this.keys.ArrowDown || this.keys.KeyS) {
      dy += 1;
      this.player.facing = "down";
    }
    if (this.keys.ArrowLeft || this.keys.KeyA) {
      dx -= 1;
      this.player.facing = "left";
    }
    if (this.keys.ArrowRight || this.keys.KeyD) {
      dx += 1;
      this.player.facing = "right";
    }

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.player.isMoving = dx !== 0 || dy !== 0;

    if (this.player.isMoving) {
      this.player.walkCycle += dt * (8 + this.player.speedLevel * 1.5);
      this.player.dustTimer += dt;

      // Poeirinha fofa nas patas ao correr
      if (this.player.dustTimer > 0.14) {
        this.player.dustTimer = 0;
        this.particles.push({
          x: this.player.x - dx * 10 + (this.random() - 0.5) * 8,
          y: this.player.y + 12,
          vx: -dx * 15,
          vy: -8,
          gravity: 0,
          color: "rgba(254, 243, 199, 0.65)",
          size: 5,
          life: 0.28,
          type: "dust",
        });
      }

      const stepX = dx * this.player.speed * 60 * dt;
      const stepY = dy * this.player.speed * 60 * dt;
      this.movePlayerWithCornerSlide(stepX, stepY);
    } else {
      this.player.walkCycle = 0;
    }

    // Checa chegada na Casinha (13, 1)
    const pCol = Math.floor(this.player.x / TILE_SIZE);
    const pRow = Math.floor(this.player.y / TILE_SIZE);
    if (this.grid[pRow][pCol] === TILE.GOAL_HOUSE) {
      this.triggerVictory();
      return;
    }

    // Atualiza Ossinhos Apitadores
    for (let i = this.activeBombs.length - 1; i >= 0; i--) {
      const b = this.activeBombs[i];
      b.timer -= dt;
      b.noteTimer += dt;

      // Solta notinha musical flutuante enquanto apita
      if (b.noteTimer > 0.45) {
        b.noteTimer = 0;
        this.particles.push({
          x: b.x + (this.random() - 0.5) * 14,
          y: b.y - 10,
          vx: (this.random() - 0.5) * 20,
          vy: -35,
          gravity: 0,
          color: "#fb7185",
          size: 6,
          life: 0.55,
          type: "note",
        });
      }

      if (b.timer <= 0) {
        this.detonateBone(b);
        this.activeBombs.splice(i, 1);
      }
    }

    // Atualiza Explosões Sônicas
    for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
      const exp = this.activeExplosions[i];
      exp.life -= dt;

      // Verifica colisão com o cachorrinho
      if (
        pCol === exp.col &&
        pRow === exp.row &&
        this.player.invulnerableTimer <= 0
      ) {
        this.damagePlayer();
      }

      // Verifica colisão com os Gatos de Beco
      this.enemies.forEach((cat) => {
        if (cat.alive) {
          const cCol = Math.floor(cat.x / TILE_SIZE);
          const cRow = Math.floor(cat.y / TILE_SIZE);
          if (cCol === exp.col && cRow === exp.row) {
            this.defeatCat(cat);
          }
        }
      });

      if (exp.life <= 0) {
        this.activeExplosions.splice(i, 1);
      }
    }

    // Coleta de Power-ups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pw = this.powerups[i];
      pw.anim += dt * 4;
      if (
        Math.hypot(this.player.x - pw.x, this.player.y - pw.y) <
        TILE_SIZE * 0.58
      ) {
        this.collectPowerup(pw);
        this.powerups.splice(i, 1);
      }
    }

    // Atualiza Gatos de Beco
    this.updateCats(dt);

    // Atualiza Partículas Físicas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += (p.gravity || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Atualiza Textos Flutuantes
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  /**
   * Movimentação com "Corner Sliding" estilo Super Bomberman
   * Se o jogador tentar virar num corredor e esbarrar na quina de um pilar,
   * o motor alinha suavemente o cachorrinho ao centro do corredor.
   */
  movePlayerWithCornerSlide(dx: number, dy: number) {
    const radius = 15; // Raio de colisão gentil para corredores de 48px
    const slideSpeed = 2.6;

    // Tentativa Horizontal
    if (dx !== 0) {
      if (
        !this.checkCollision(
          this.player.x + dx,
          this.player.y,
          radius,
          this.player,
        )
      ) {
        this.player.x += dx;
      } else if (dy === 0) {
        // Assistência de esquina vertical para entrar no corredor horizontal
        const currentRow = Math.floor(this.player.y / TILE_SIZE);
        const targetCenterY = currentRow * TILE_SIZE + TILE_SIZE / 2;
        const diffY = targetCenterY - this.player.y;
        if (Math.abs(diffY) > 1 && Math.abs(diffY) < 18) {
          const stepSlide = Math.sign(diffY) * slideSpeed;
          if (
            !this.checkCollision(
              this.player.x,
              this.player.y + stepSlide,
              radius,
              this.player,
            )
          ) {
            this.player.y += stepSlide;
          }
        }
      }
    }

    // Tentativa Vertical
    if (dy !== 0) {
      if (
        !this.checkCollision(
          this.player.x,
          this.player.y + dy,
          radius,
          this.player,
        )
      ) {
        this.player.y += dy;
      } else if (dx === 0) {
        // Assistência de esquina horizontal para entrar no corredor vertical
        const currentCol = Math.floor(this.player.x / TILE_SIZE);
        const targetCenterX = currentCol * TILE_SIZE + TILE_SIZE / 2;
        const diffX = targetCenterX - this.player.x;
        if (Math.abs(diffX) > 1 && Math.abs(diffX) < 18) {
          const stepSlide = Math.sign(diffX) * slideSpeed;
          if (
            !this.checkCollision(
              this.player.x + stepSlide,
              this.player.y,
              radius,
              this.player,
            )
          ) {
            this.player.x += stepSlide;
          }
        }
      }
    }
  }

  checkCollision(wx: number, wy: number, radius: number, entity: Position) {
    const minC = Math.floor((wx - radius) / TILE_SIZE);
    const maxC = Math.floor((wx + radius) / TILE_SIZE);
    const minR = Math.floor((wy - radius) / TILE_SIZE);
    const maxR = Math.floor((wy + radius) / TILE_SIZE);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
        const t = this.grid[r][c];
        if (t === TILE.GOAL_HOUSE && entity !== this.player) return true;
        if (t === TILE.WALL_SOLID || t === TILE.BOX_CRATE) return true;

        const bomb = this.activeBombs.find((b) => b.col === c && b.row === r);
        if (bomb) {
          // The owner can fully leave the occupied cell once, then it is solid.
          // A distance threshold trapped the original dog at the cell edge.
          if (entity === this.player && bomb.playerCanExit) {
            const left = c * TILE_SIZE;
            const top = r * TILE_SIZE;
            const overlaps =
              entity.x + radius >= left &&
              entity.x - radius < left + TILE_SIZE &&
              entity.y + radius >= top &&
              entity.y - radius < top + TILE_SIZE;
            if (overlaps) continue;
            bomb.playerCanExit = false;
          }
          return true;
        }
      }
    }
    return false;
  }

  collectPowerup(pw: Powerup) {
    this.audio.playPowerup();
    let label = "";
    let color = "#fef08a";

    if (pw.type === POWERUP.SPEED) {
      if (this.player.speedLevel < 4) {
        this.player.speedLevel++;
        this.player.speed += 0.45;
      }
      label = "+1 VELOCIDADE!";
      color = "#38bdf8";
    } else if (pw.type === POWERUP.RANGE) {
      if (this.player.bombRange < 6) {
        this.player.bombRange++;
      }
      label = "+1 ALCANCE!";
      color = "#fbbf24";
    } else if (pw.type === POWERUP.BOMB_COUNT) {
      if (this.player.maxBombs < 5) {
        this.player.maxBombs++;
      }
      label = "+1 OSSO!";
      color = "#4ade80";
    }

    this.spawnFloatingText(pw.x, pw.y - 12, label, color);

    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x: pw.x,
        y: pw.y,
        vx: Math.cos(a) * 65,
        vy: Math.sin(a) * 65 - 20,
        gravity: 60,
        color,
        size: 4,
        life: 0.45,
        type: "spark",
      });
    }
  }

  updateCats(dt: number) {
    const vector: Record<Direction, { x: number; y: number }> = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const opposite: Record<Direction, Direction> = {
      up: "down",
      down: "up",
      left: "right",
      right: "left",
    };
    for (const cat of this.enemies) {
      if (!cat.alive) continue;
      cat.animTime += dt * 7;
      let budget = cat.speed * 60 * dt;
      for (let segment = 0; budget > 0 && segment < 4; segment++) {
        if (!cat.target) {
          const direction = this.pickNewCatDirection(cat);
          if (!direction) break;
          const move = vector[direction];
          cat.target = {
            col: Math.round((cat.x - 24) / TILE_SIZE) + move.x,
            row: Math.round((cat.y - 24) / TILE_SIZE) + move.y,
          };
        }
        const tx = cat.target.col * TILE_SIZE + 24,
          ty = cat.target.row * TILE_SIZE + 24;
        const dx = tx - cat.x,
          dy = ty - cat.y,
          distance = Math.hypot(dx, dy);
        if (distance < 1e-7) {
          cat.x = tx;
          cat.y = ty;
          cat.target = null;
          continue;
        }
        const step = Math.min(distance, budget);
        const nextX = cat.x + (dx / distance) * step,
          nextY = cat.y + (dy / distance) * step;
        if (this.checkCollision(nextX, nextY, 13, cat)) {
          // Return along the same segment if a newly placed bone blocks it.
          const move = vector[cat.dir];
          cat.target = {
            col: cat.target.col - move.x,
            row: cat.target.row - move.y,
          };
          cat.dir = opposite[cat.dir];
          break;
        }
        cat.x = nextX;
        cat.y = nextY;
        budget -= step;
        if (distance <= step + 1e-7) {
          cat.x = tx;
          cat.y = ty;
          cat.target = null;
        }
      }
      if (
        Math.hypot(cat.x - this.player.x, cat.y - this.player.y) < 25 &&
        this.player.invulnerableTimer <= 0
      )
        this.damagePlayer();
    }
  }

  hasLineOfSight(cat: Cat) {
    const col = Math.round((cat.x - 24) / TILE_SIZE),
      row = Math.round((cat.y - 24) / TILE_SIZE);
    const playerCol = Math.floor(this.player.x / TILE_SIZE),
      playerRow = Math.floor(this.player.y / TILE_SIZE);
    if (col !== playerCol && row !== playerRow) return false;
    const dx = Math.sign(playerCol - col),
      dy = Math.sign(playerRow - row);
    if (dx === 0 && dy === 0) return false;
    let c = col,
      r = row;
    while (c !== playerCol || r !== playerRow) {
      c += dx;
      r += dy;
      const tile = this.grid[r]?.[c];
      if (
        tile === undefined ||
        tile === TILE.WALL_SOLID ||
        tile === TILE.BOX_CRATE ||
        this.activeBombs.some((b) => b.col === c && b.row === r)
      )
        return false;
    }
    return true;
  }

  pickNewCatDirection(cat: Cat): Direction | null {
    const dirs: { name: Direction; dx: number; dy: number }[] = [
      { name: "up", dx: 0, dy: -1 },
      { name: "down", dx: 0, dy: 1 },
      { name: "left", dx: -1, dy: 0 },
      { name: "right", dx: 1, dy: 0 },
    ];
    const opposite: Record<Direction, Direction> = {
      up: "down",
      down: "up",
      left: "right",
      right: "left",
    };
    const open = dirs.filter(
      (d) =>
        !this.checkCollision(
          cat.x + d.dx * TILE_SIZE,
          cat.y + d.dy * TILE_SIZE,
          13,
          cat,
        ),
    );
    if (!open.length) return null;
    const behavior = cat.behavior ?? "wander";
    let chosen: Direction | undefined;
    if (behavior === "linear") {
      chosen =
        open.find((d) => d.name === cat.dir)?.name ??
        open.find((d) => d.name === opposite[cat.dir])?.name;
      if (!chosen) return null;
    } else if (behavior === "hunter" && this.hasLineOfSight(cat)) {
      const direction: Direction =
        Math.floor(cat.y / TILE_SIZE) === Math.floor(this.player.y / TILE_SIZE)
          ? this.player.x > cat.x
            ? "right"
            : "left"
          : this.player.y > cat.y
            ? "down"
            : "up";
      chosen = open.find((d) => d.name === direction)?.name;
    }
    if (!chosen) {
      const forward = open.filter((d) => d.name !== opposite[cat.dir]);
      const choices = forward.length ? forward : open;
      chosen = choices[Math.floor(this.random() * choices.length)].name;
    }
    cat.dir = chosen;
    return chosen;
  }

  defeatCat(cat: Cat) {
    cat.alive = false;
    this.audio.playCatMeow();
    this.spawnFloatingText(cat.x, cat.y - 14, "MIAU!!", "#f472b6");

    for (let i = 0; i < 14; i++) {
      const a = this.random() * Math.PI * 2;
      const spd = 40 + this.random() * 90;
      this.particles.push({
        x: cat.x,
        y: cat.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 40,
        gravity: 150,
        color: i % 2 === 0 ? "#fde047" : "#f8fafc",
        size: 5,
        life: 0.55,
        type: "star",
      });
    }
  }

  damagePlayer() {
    if (this.state !== "PLAYING" || this.player.invulnerableTimer > 0) return;
    this.player.lives--;
    this.player.invulnerableTimer = 2.0;
    this.screenShake = 10;
    this.audio.playHurt();
    this.spawnFloatingText(
      this.player.x,
      this.player.y - 15,
      "AI! CUIDADO!",
      "#fb7185",
    );

    if (this.player.lives <= 0) {
      this.triggerGameOver("Os gatos de beco assustaram o cãozinho!");
    }
  }

  triggerVictory() {
    this.state = "VICTORY";
    this.audio.playVictory();
  }

  triggerGameOver(reason: string) {
    this.state = "GAMEOVER";
    this.reason = reason;
  }
}

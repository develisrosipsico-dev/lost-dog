export class RetroAudioEngine {
  ctx!: AudioContext;
  sfxMuted = false;
  bgmPlaying = false;
  bgmEnabled = true;
  bgmStep = 0;
  bgmInterval: ReturnType<typeof setInterval> | null = null;
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleSFX() {
    this.sfxMuted = !this.sfxMuted;
    return !this.sfxMuted;
  }

  toggleBGM() {
    this.init();
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
    return this.bgmEnabled;
  }

  startBGM() {
    if (!this.bgmEnabled || this.bgmInterval) return;
    this.init();
    // Melodia alegre estilo SNES Bomberman (em Dó Maior / Lá menor)
    const melody = [
      523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 659.25, 523.25, 440.0,
      523.25, 659.25, 523.25, 493.88, 587.33, 523.25, 392.0,
    ];
    const bass = [
      130.81, 196.0, 130.81, 196.0, 146.83, 220.0, 130.81, 196.0, 110.0, 164.81,
      110.0, 164.81, 98.0, 146.83, 130.81, 196.0,
    ];

    this.bgmInterval = setInterval(() => {
      if (!this.bgmEnabled || !this.ctx || this.ctx.state !== "running") return;
      const mFreq = melody[this.bgmStep % melody.length];
      const bFreq = bass[this.bgmStep % bass.length];

      // Canal Lead (Square suave)
      this.playNote(mFreq, "square", 0.14, 0.028);
      // Canal Bass (Triangle encorpado)
      if (this.bgmStep % 2 === 0) {
        this.playNote(bFreq, "triangle", 0.24, 0.05);
      }
      this.bgmStep++;
    }, 185);
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  playNote(freq: number, type: OscillatorType, duration: number, vol: number) {
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    } catch (e) {}
  }

  playSqueak() {
    if (this.sfxMuted) return;
    this.init();
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(650, t);
      osc.frequency.exponentialRampToValueAtTime(1450, t + 0.09);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.18);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch (e) {}
  }

  playSonicBark() {
    if (this.sfxMuted) return;
    this.init();
    try {
      const t = this.ctx.currentTime;
      // "AU!" duplo potente + onda de impacto
      [0, 0.11].forEach((offset, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(idx === 0 ? 320 : 380, t + offset);
        osc.frequency.exponentialRampToValueAtTime(95, t + offset + 0.22);
        gain.gain.setValueAtTime(0.22, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.24);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.24);
      });

      // Ruído branco filtrado para explosão sônica
      const bufferSize = this.ctx.sampleRate * 0.32;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(140, t + 0.32);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.22, t);
      nGain.gain.exponentialRampToValueAtTime(0.005, t + 0.32);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.32);
    } catch (e) {}
  }

  playPowerup() {
    if (this.sfxMuted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      setTimeout(() => this.playNote(f, "square", 0.09, 0.1), i * 55);
    });
  }

  playCatMeow() {
    if (this.sfxMuted) return;
    this.init();
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(850, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(480, t + 0.28);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    } catch (e) {}
  }

  playHurt() {
    if (this.sfxMuted) return;
    this.init();
    [240, 170, 120].forEach((f, i) => {
      setTimeout(() => this.playNote(f, "sawtooth", 0.12, 0.18), i * 65);
    });
  }

  playVictory() {
    if (this.sfxMuted) return;
    this.init();
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 110, 220, 330, 480, 620];
    fanfare.forEach((f, i) => {
      setTimeout(() => this.playNote(f, "square", 0.22, 0.14), times[i]);
    });
  }
}

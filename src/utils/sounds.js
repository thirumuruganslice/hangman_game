class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx)
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Core: ramp a tone with optional vibrato
  _tone(freq, dur, type = "sine", vol = 0.3, delay = 0, vibrato = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + delay;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (vibrato > 0) {
        osc.frequency.linearRampToValueAtTime(freq + vibrato, t + dur * 0.5);
        osc.frequency.linearRampToValueAtTime(freq, t + dur);
      }
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      return;
    }
  }

  // Noise burst (for percussive hits)
  _noise(dur, vol = 0.15, delay = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.init();
      const bufSize = ctx.sampleRate * dur;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch {
      return;
    }
  }

  // Bubbly pop click
  playKeyClick() {
    this._tone(900, 0.035, "sine", 0.06, 0);
    this._tone(1200, 0.025, "sine", 0.04, 0.02);
  }

  // Sparkle arpeggio — correct guess
  playCorrect() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this._tone(f, 0.1, "sine", 0.28, i * 0.07));
  }

  // Combo: accelerating sparkle zoom (consecutive corrects)
  playCombo(count) {
    const base = 400 + count * 120;
    [0, 1, 2, 3].forEach((i) =>
      this._tone(base + i * 180, 0.08, "triangle", 0.25, i * 0.045)
    );
  }

  // Sad trombone — wrong guess
  playWrong() {
    this._tone(380, 0.15, "sawtooth", 0.22, 0);
    this._tone(320, 0.15, "sawtooth", 0.22, 0.14);
    this._tone(260, 0.3, "sawtooth", 0.28, 0.28, 12);
  }

  // PANIC — 5th wrong guess
  playNearDeath() {
    [0, 1, 2, 3, 4, 5].forEach((i) =>
      this._tone(200 + i * 30, 0.07, "square", 0.18, i * 0.05)
    );
    this._tone(130, 0.5, "sawtooth", 0.22, 0.35, 20);
  }

  // ── EPIC VICTORY FANFARE ─────────────────────────────────────────────────
  playWin() {
    // ── Drum intro hits ──────────────────────────────────────────────────
    this._noise(0.08, 0.28, 0.0);   // snare
    this._noise(0.08, 0.28, 0.18);
    this._noise(0.12, 0.35, 0.36);
    this._tone(80, 0.12, "sine", 0.35, 0.0);   // kick
    this._tone(80, 0.12, "sine", 0.35, 0.18);
    this._tone(80, 0.15, "sine", 0.4, 0.36);

    // ── Rising fanfare blast ─────────────────────────────────────────────
    const rise = [330, 392, 494, 587, 659];
    rise.forEach((f, i) => this._tone(f, 0.09, "square", 0.22, 0.5 + i * 0.06));

    // ── Mario-ish main melody ────────────────────────────────────────────
    const melody = [
      [523, 0.12, 0.9], [523, 0.12, 1.04], [523, 0.14, 1.18],
      [415, 0.08, 1.34], [523, 0.14, 1.44], [659, 0.32, 1.62],
      [784, 0.14, 2.0], [698, 0.12, 2.16], [784, 0.60, 2.30],
    ];
    melody.forEach(([f, d, s]) => this._tone(f, d, "square", 0.24, s));

    // ── Harmony layer ────────────────────────────────────────────────────
    const harmony = [
      [659, 0.35, 1.62], [523, 0.35, 2.0], [659, 0.65, 2.30],
    ];
    harmony.forEach(([f, d, s]) => this._tone(f, d, "triangle", 0.14, s));

    // ── Bass line ────────────────────────────────────────────────────────
    const bass = [
      [131, 0.18, 0.9], [165, 0.18, 1.44], [196, 0.35, 1.62],
      [131, 0.35, 2.0], [196, 0.65, 2.30],
    ];
    bass.forEach(([f, d, s]) => this._tone(f, d, "sawtooth", 0.16, s));

    // ── High sparkle cascade on beat ────────────────────────────────────
    [1047, 1175, 1319, 1568, 2093].forEach((f, i) =>
      this._tone(f, 0.07, "sine", 0.1, 1.62 + i * 0.055)
    );

    // ── SECOND PHRASE: bigger + triumphant ──────────────────────────────
    const phrase2 = [
      [784, 0.12, 3.0], [880, 0.12, 3.14], [988, 0.14, 3.28],
      [1047, 0.70, 3.46],
    ];
    phrase2.forEach(([f, d, s]) => this._tone(f, d, "square", 0.22, s));

    // harmony 2
    [[659, 0.75, 3.46], [523, 0.75, 3.46]].forEach(([f, d, s]) =>
      this._tone(f, d, "triangle", 0.1, s)
    );

    // ── Final sparkle burst ──────────────────────────────────────────────
    [1319, 1568, 1760, 2093, 2637].forEach((f, i) =>
      this._tone(f, 0.1, "sine", 0.12, 3.46 + i * 0.07)
    );

    // ── Closing drum roll ────────────────────────────────────────────────
    [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) =>
      this._noise(0.05, 0.12 + i * 0.025, 3.0 + i * 0.05)
    );
  }

  // Extra victory bell - call 4s into win for lingering magic
  playVictoryBells() {
    [1047, 1319, 1568, 2093, 1568, 1319].forEach((f, i) =>
      this._tone(f, 0.4, "sine", 0.18, i * 0.22)
    );
  }

  // Lose: Price is Right loser horn
  playLose() {
    const m = [
      [466, 0.2, 0], [440, 0.2, 0.22], [415, 0.2, 0.44],
      [392, 0.3, 0.66], [370, 0.7, 0.98],
    ];
    m.forEach(([f, d, s]) => this._tone(f, d, "sawtooth", 0.24, s, 8));
  }

  // New game: bouncy level start
  playNewGame() {
    [330, 392, 494, 659].forEach((f, i) =>
      this._tone(f, 0.09, "square", 0.18, i * 0.08)
    );
  }

  // Spooky body-part thud
  playBodyPart() {
    this._tone(220, 0.06, "square", 0.15, 0);
    this._tone(110, 0.18, "sawtooth", 0.18, 0.05);
  }
}

export const soundManager = new SoundManager();

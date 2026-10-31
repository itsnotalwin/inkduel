/**
 * Procedural sound via Web Audio API — zero audio assets.
 * Global mute state persists in localStorage (and later in player settings).
 */

// sting variations — v0 is the original; the game seed picks deterministically
const VICTORY_STINGS: { notes: number[]; wave: OscillatorType; gap: number }[] = [
  { notes: [880, 1320], wave: "square", gap: 0.16 },
  { notes: [739.99, 987.77, 1479.98], wave: "triangle", gap: 0.13 },
  { notes: [659.26, 987.77, 1318.51], wave: "square", gap: 0.2 },
];
const DEFEAT_STINGS: { from: number; to: number; wave: OscillatorType; dur: number }[] = [
  { from: 180, to: 90, wave: "sine", dur: 0.7 },
  { from: 196, to: 82, wave: "triangle", dur: 0.85 },
  { from: 220, to: 110, wave: "sine", dur: 0.55 },
];
// legendary motif material — hashed per card id so each legendary keeps a fixed voice
const LEGENDARY_SCALES: number[][] = [
  [0, 3, 5, 7, 10],       // minor pentatonic
  [0, 2, 4, 7, 9],        // major pentatonic
  [0, 2, 3, 5, 7, 8, 10], // natural minor
  [0, 2, 4, 6, 7, 9, 11], // lydian
];
const LEGENDARY_WAVES: OscillatorType[] = ["triangle", "square", "sine", "sawtooth"];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;

  constructor() {
    if (typeof window !== "undefined") {
      this._muted = window.localStorage.getItem("inkduel:muted") === "1";
    }
  }

  get muted() {
    return this._muted;
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("inkduel:muted", m ? "1" : "0");
    }
  }

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Paper slide — filtered noise burst, 120ms (draw). */
  paperSlide() {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.14);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13);
    src.connect(filter).connect(gain).connect(master);
    src.start();
    src.stop(ctx.currentTime + 0.15);
  }

  /** Pen scratch — noise + 2kHz bandpass, 90ms (card played). */
  penScratch() {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.1);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
    src.connect(filter).connect(gain).connect(master);
    src.start();
    src.stop(ctx.currentTime + 0.1);
  }

  /** Stamp thunk — 60Hz sine + click transient (turn banner, stamps). */
  stampThunk() {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(60, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.2);
    // click transient
    const click = ctx.createBufferSource();
    click.buffer = this.noiseBuffer(ctx, 0.03);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.25, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    click.connect(cg).connect(master);
    click.start(t);
  }

  /** Soft pop — targeting select. */
  pop() {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.07);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Low page-tear — unit death. */
  pageTear() {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(140, t + 0.28);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
    src.stop(t + 0.32);
  }

  /** Typewriter ding — victory. One of three variants, picked by the game seed. */
  victoryDing(seed = 0) {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const sting = VICTORY_STINGS[seed % VICTORY_STINGS.length];
    sting.notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * sting.gap;
      const osc = ctx.createOscillator();
      osc.type = sting.wave;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  /** Low falling note — defeat. One of three variants, picked by the game seed. */
  defeatNote(seed = 0) {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const sting = DEFEAT_STINGS[seed % DEFEAT_STINGS.length];
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = sting.wave;
    osc.frequency.setValueAtTime(sting.from, t);
    osc.frequency.exponentialRampToValueAtTime(sting.to, t + sting.dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + sting.dur + 0.05);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + sting.dur + 0.1);
  }

  /** Legendary signature — a short motif hashed from the card id, so a given legendary always sounds like itself. */
  legendaryMotif(cardId: string) {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const t0 = ctx.currentTime;
    // FNV-1a: a stable 32-bit identity for the card id
    let h = 2166136261;
    for (let i = 0; i < cardId.length; i++) {
      h ^= cardId.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const pick = (shift: number, n: number) => (h >>> shift) % n;
    const scale = LEGENDARY_SCALES[pick(0, LEGENDARY_SCALES.length)];
    const root = 220 * 2 ** (pick(2, 12) / 12);
    const wave = LEGENDARY_WAVES[pick(6, LEGENDARY_WAVES.length)];
    const step = 0.12 + pick(8, 4) * 0.025;
    // a stamp-weighted thump under the melody
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(65, t0);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.35, t0);
    tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    thump.connect(tg).connect(master);
    thump.start(t0);
    thump.stop(t0 + 0.2);
    // five notes: the root, three hashed scale degrees, resolving to root or its octave
    const notes = [
      scale[0],
      scale[pick(10, scale.length)],
      scale[pick(13, scale.length)],
      scale[pick(16, scale.length)],
      pick(19, 2) === 1 ? 12 : 0,
    ];
    notes.forEach((semis, i) => {
      const oct = pick(21 + i, 4) === 3 ? 12 : 0; // the occasional note sparkles an octave up
      const t = t0 + 0.06 + i * step;
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.value = root * 2 ** ((semis + oct) / 12);
      osc.detune.value = pick(26 + i, 9) - 4; // ±4 cents — keeps it handmade
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.11, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }
}

export const sound = new SoundEngine();

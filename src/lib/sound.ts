/**
 * Procedural sound via Web Audio API — zero audio assets.
 * Global mute state persists in localStorage (and later in player settings).
 */

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

  /** Two-note typewriter ding — victory. */
  victoryDing() {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const notes = [880, 1320];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.16;
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  /** Low single note — defeat. */
  defeatNote() {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.7);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.8);
  }
}

export const sound = new SoundEngine();

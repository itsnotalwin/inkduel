/**
 * Procedural ambient soundscape — a paper-noise floor plus a low ink-drone
 * whose brightness tracks the game phase. Zero audio assets. Starts on the
 * first user gesture (browser autoplay policy); the global mute silences it.
 */

export type AmbientPhase = "mulligan" | "player" | "opponent" | "over";

const PHASE_SETTINGS: Record<AmbientPhase, { cutoff: number; drone: number; noise: number }> = {
  mulligan: { cutoff: 320, drone: 0.016, noise: 0.010 },
  player: { cutoff: 760, drone: 0.034, noise: 0.016 },
  opponent: { cutoff: 430, drone: 0.022, noise: 0.013 },
  over: { cutoff: 240, drone: 0.012, noise: 0.008 },
};

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private started = false;
  private _muted = false;

  get running() {
    return this.started;
  }

  start() {
    if (this.started || typeof window === "undefined") return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this._muted ? 0 : 0.9;
    this.master.connect(ctx.destination);

    // ── paper-noise floor: looped filtered noise ──
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = "lowpass";
    this.noiseFilter.frequency.value = PHASE_SETTINGS.mulligan.cutoff;
    this.noiseFilter.Q.value = 0.4;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = PHASE_SETTINGS.mulligan.noise;
    noise.connect(this.noiseFilter).connect(this.noiseGain).connect(this.master);
    noise.start();

    // ── ink-drone: two low detuned voices through a slow-breathing gain ──
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = PHASE_SETTINGS.mulligan.drone;
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = "lowpass";
    this.droneFilter.frequency.value = 300;
    this.droneGain.connect(this.droneFilter).connect(this.master);
    const voices: [number, OscillatorType, number][] = [
      [55, "sine", 0],
      [82.41, "triangle", 3],
    ];
    for (const [freq, type, detune] of voices) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      osc.connect(g).connect(this.droneGain);
      osc.start();
    }
    // slow breathing on the drone
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.008;
    this.lfo.connect(lfoGain).connect(this.droneGain.gain);
    this.lfo.start();

    this.started = true;
  }

  /** Morph the bed toward the new phase (slow ramps — no clicks). */
  setPhase(phase: AmbientPhase) {
    if (!this.started || !this.ctx || !this.noiseFilter || !this.noiseGain || !this.droneGain) return;
    const t = this.ctx.currentTime;
    const s = PHASE_SETTINGS[phase];
    this.noiseFilter.frequency.setTargetAtTime(s.cutoff, t, 1.2);
    this.noiseGain.gain.setTargetAtTime(s.noise, t, 1.2);
    this.droneGain.gain.setTargetAtTime(s.drone, t, 1.6);
  }

  /** A short swell when the match ends. */
  swell() {
    if (!this.started || !this.ctx || !this.droneGain || !this.noiseGain) return;
    const t = this.ctx.currentTime;
    this.droneGain.gain.cancelScheduledValues(t);
    this.droneGain.gain.setTargetAtTime(0.07, t, 0.4);
    this.droneGain.gain.setTargetAtTime(PHASE_SETTINGS.over.drone, t + 2.2, 2);
    this.noiseGain.gain.setTargetAtTime(0.02, t, 0.5);
    this.noiseGain.gain.setTargetAtTime(PHASE_SETTINGS.over.noise, t + 2.2, 2);
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.15);
    }
  }

  stop() {
    if (!this.started) return;
    void this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}

export const ambient = new AmbientEngine();

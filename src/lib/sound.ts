/**
 * INKDUEL sound engine — real recorded CC0 assets (public/sfx, public/music)
 * with the original procedural WebAudio patches as fallback, so the game still
 * sounds alive even if an asset is missing (e.g. first paint offline, or a
 * partially-cached install).
 *
 * Routing: SFX are decoded PCM buffers played through WebAudio (per-shot gain,
 * slight rate variance so repeated hits never sound machine-gunned). Music is
 * a single streaming <audio> element routed through a MediaElementSourceNode →
 * gain node — real fades and voice-ducking that work on iOS, without holding
 * three minutes of decoded PCM in memory.
 *
 * Mute state persists in localStorage and silences SFX, music and the
 * ambient bed alike.
 */

/** Pages deploys live under /inkduel — asset URLs must carry the basePath. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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

/** The looping music scenes; "defeat" is a somber bed for the result screen. */
export type MusicScene = "menu" | "duel" | "draft" | "defeat";

/** Default bed level per scene — ambience, never a spotlight. */
const SCENE_LEVEL: Record<MusicScene, number> = {
  menu: 0.5,
  duel: 0.42,
  draft: 0.5,
  defeat: 0.55,
};

type FxName =
  | "click" | "select" | "confirm" | "error" | "toggle"
  | "panel-open" | "panel-close" | "back" | "tick"
  | "draw" | "play-unit" | "play-spell" | "hand-select" | "shuffle"
  | "pack-open" | "pack-take" | "card-fan" | "draft-pick"
  | "attack" | "splash" | "heal" | "stamp" | "legendary" | "death"
  | "victory";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;

  // ── asset plumbing ──
  private buffers = new Map<FxName, AudioBuffer>();
  private loading = new Set<FxName>();
  private broken = new Set<FxName>();

  // ── music plumbing (one persistent element, gain-routed) ──
  private musicEl: HTMLAudioElement | null = null;
  private musicGain: GainNode | null = null;
  private musicScene: MusicScene | null = null;
  private wantedScene: MusicScene | null = null;
  private musicRamp: number | null = null;

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
    if (m) {
      if (this.musicEl) this.musicEl.pause();
      this.wantedScene = null;
      this.musicScene = null;
    } else if (this.wantedScene) {
      const want = this.wantedScene;
      this.playMusic(want);
    }
    if (this.ctx && this.master && this.ctx.state === "suspended") void this.ctx.resume();
  }

  // ───────────────────────────────────────────────────────────────────
  // WebAudio core
  // ───────────────────────────────────────────────────────────────────

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

  /** Unlock audio after the first user gesture (iOS autoplay policy). */
  prime() {
    if (this.ensure() && this.wantedScene && !this._muted && !this.musicScene) {
      const want = this.wantedScene;
      this.playMusic(want);
    }
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ───────────────────────────────────────────────────────────────────
  // Asset SFX — decoded buffers, zero latency, iOS-safe volumes
  // ───────────────────────────────────────────────────────────────────

  private async loadFx(name: FxName): Promise<AudioBuffer | null> {
    if (this.buffers.has(name)) return this.buffers.get(name)!;
    if (this.broken.has(name) || this.loading.has(name)) return null;
    this.loading.add(name);
    try {
      const res = await fetch(`${BASE_PATH}/sfx/${name}.mp3`);
      if (!res.ok) throw new Error(String(res.status));
      const raw = await res.arrayBuffer();
      const ctx = this.ensure();
      if (!ctx) return null;
      const buf = await ctx.decodeAudioData(raw);
      this.buffers.set(name, buf);
      return buf;
    } catch {
      this.broken.add(name);
      return null;
    } finally {
      this.loading.delete(name);
    }
  }

  /**
   * Fire an asset one-shot; falls back to the procedural patch while the
   * buffer loads (first hit of a session) or when the asset is unavailable.
   */
  private fx(name: FxName, volume: number, fallback: () => void, rateJitter = 0.05) {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const buf = this.buffers.get(name);
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 1 + (Math.random() * 2 - 1) * rateJitter;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      src.connect(gain).connect(this.master);
      src.start();
      return;
    }
    fallback();
    void this.loadFx(name); // warm for next time
  }

  // ── UI sounds ──
  /** Soft typewriter tick — every button press (global listener). */
  click() { this.fx("click", 0.5, () => this.procPop(0.06, 900, 520)); }
  /** Target or option picked. */
  select() { this.fx("select", 0.9, () => this.procPop(0.16, 340, 180)); }
  /** A thing was earned — reward, achievement, blessing. */
  confirm() { this.fx("confirm", 0.9, () => this.procVictoryDing(0)); }
  /** Invalid action — not enough ink, illegal target. */
  error() { this.fx("error", 0.8, () => this.procPop(0.14, 160, 90)); }
  /** Settings switch flips. */
  toggle() { this.fx("toggle", 0.7, () => this.procPop(0.1, 500, 300)); }
  panelOpen() { this.fx("panel-open", 0.6, () => this.procPop(0.08, 700, 900)); }
  panelClose() { this.fx("panel-close", 0.6, () => this.procPop(0.08, 900, 700)); }
  back() { this.fx("back", 0.5, () => this.procPop(0.07, 600, 380)); }
  tick() { this.fx("tick", 0.6, () => this.procPop(0.05, 1100, 900)); }

  // ── card & duel sounds ──
  /** A card slides off the deck — draw. */
  draw() { this.fx("draw", 0.85, () => this.procPaperSlide()); }
  /** A unit is placed on the board. */
  playUnit() { this.fx("play-unit", 0.95, () => this.procPenScratch()); }
  /** A spell is cast — paper shove across the table. */
  playSpell() { this.fx("play-spell", 0.9, () => this.procPenScratch()); }
  /** A card is lifted from the hand (inspecting, aiming). */
  handSelect() { this.fx("hand-select", 0.7, () => this.procPaperSlide()); }
  /** Cards riffled — duel start, deck rebuild. */
  shuffle() { this.fx("shuffle", 0.9, () => this.procStampThunk()); }
  /** Card lands on the table — generic placement (draft, areas). */
  cardPlace() { this.fx("draft-pick", 0.85, () => this.procPop(0.12, 300, 200)); }
  /** A pack tears open. */
  packOpen() { this.fx("pack-open", 1, () => this.procStampThunk()); }
  /** A card is pulled from the opened pack. */
  packTake() { this.fx("pack-take", 0.9, () => this.procPaperSlide()); }
  /** A hand of cards fans out. */
  cardFan() { this.fx("card-fan", 0.8, () => this.procPaperSlide()); }
  /** Attack connects — blunt impact. */
  attack() { this.fx("attack", 0.95, () => this.procStampThunk()); }
  /** Ink hits paper — heavier spell/a splash moment. */
  splash() { this.fx("splash", 0.8, () => this.procPageTear()); }
  /** Vitality returns — soft ink plop. */
  heal() { this.fx("heal", 0.7, () => this.procPop(0.1, 260, 340)); }
  /** Rubber stamp lands — turn banner, big moments. */
  stamp() { this.fx("stamp", 0.95, () => this.procStampThunk()); }
  /** A unit dies — the paper crumples. */
  pageTear() { this.fx("death", 0.9, () => this.procPageTear()); }
  /** Legendary arrives — a bell over its signature motif. */
  legendaryAccent() { this.fx("legendary", 0.7, () => undefined); }

  // ───────────────────────────────────────────────────────────────────
  // Music — one streaming element routed through a gain node
  // ───────────────────────────────────────────────────────────────────

  /** Start (or switch to) a looping scene track with a fade-in. */
  playMusic(scene: MusicScene) {
    if (this._muted || typeof window === "undefined") {
      this.wantedScene = scene;
      return;
    }
    const ctx = this.ensure();
    if (!ctx || !this.master) {
      this.wantedScene = scene;
      return;
    }
    this.wantedScene = scene;
    if (this.musicScene === scene && this.musicEl && !this.musicEl.paused) return;

    if (!this.musicEl) {
      this.musicEl = new Audio();
      this.musicEl.preload = "auto";
      this.musicEl.loop = true;
      const source = ctx.createMediaElementSource(this.musicEl);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0;
      source.connect(this.musicGain).connect(this.master);
      this.musicEl.addEventListener("error", () => {
        // asset missing — drop to the procedural bed silently
        this.musicScene = null;
      });
    }
    const el = this.musicEl;
    if (el.src !== `${location.origin}${BASE_PATH}/music/${scene}.mp3`) {
      el.src = `${BASE_PATH}/music/${scene}.mp3`;
    }
    el.currentTime = 0;
    this.musicScene = scene;
    const target = SCENE_LEVEL[scene];
    void el.play()
      .then(() => this.rampMusic(target, 1.4))
      .catch(() => {
        // autoplay refused — remembered as wanted, started by the next gesture
        this.musicScene = null;
      });
  }

  /** Fade the music out and stop it (scene change or unmount). */
  stopMusic(fadeSeconds = 1) {
    this.wantedScene = null;
    this.musicScene = null;
    const el = this.musicEl;
    const gain = this.musicGain;
    if (!el || !gain || !this.ctx) {
      el?.pause();
      return;
    }
    this.rampMusic(0, fadeSeconds);
    window.setTimeout(() => {
      if (this.musicScene === null) el.pause();
    }, fadeSeconds * 1000 + 120);
  }

  /** Stop only when `scene` is still what's playing — page unmounts use this,
   *  so a duel that took over the bed isn't silenced by the page it left. */
  stopMusicIf(scene: MusicScene, fadeSeconds = 1) {
    if (this.musicScene === scene) this.stopMusic(fadeSeconds);
    else if (this.wantedScene === scene) this.wantedScene = null;
  }

  /** Duck the bed under a narrator line, then bring it back. */
  duckForVoice() {
    if (!this.musicGain || !this.ctx || !this.musicScene) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setTargetAtTime(0.18, t, 0.2);
    this.musicGain.gain.setTargetAtTime(SCENE_LEVEL[this.musicScene] ?? 0.5, t + 2.6, 0.9);
  }

  private rampMusic(target: number, seconds: number) {
    if (!this.musicGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(target, t + seconds);
  }

  // ───────────────────────────────────────────────────────────────────
  // Stings — real fanfares with procedural fallback
  // ───────────────────────────────────────────────────────────────────

  /** Victory — the "And the winner is" fanfare; falls back to the ding. */
  victorySting(seed = 0) {
    if (this._muted) return;
    this.stopMusic(0.4);
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const buf = this.buffers.get("victory");
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      src.connect(gain).connect(this.master);
      src.start();
    } else {
      this.procVictoryDing(seed);
      void this.loadFx("victory");
    }
  }

  /** Defeat — a falling note stings, then the somber "At the end of hope" bed swells. */
  defeatSting(seed = 0) {
    if (this._muted) return;
    this.procDefeatNote(seed);
    this.playMusic("defeat");
  }

  // ───────────────────────────────────────────────────────────────────
  // Legacy call-sites (kept so old pages keep working) — now asset-backed
  // ───────────────────────────────────────────────────────────────────

  /** Card draw. */
  paperSlide() { this.draw(); }
  /** Card played (any kind). */
  penScratch() { this.playUnit(); }
  /** Turn banner / stamps. */
  stampThunk() { this.stamp(); }
  /** Target select. */
  pop() { this.select(); }
  /** Unit death. */
  // pageTear() is declared above (asset-backed).
  /** Victory ding — victorySting preferred; kept for direct callers. */
  victoryDing(seed = 0) { this.victorySting(seed); }
  /** Defeat note — defeatSting preferred; kept for direct callers. */
  defeatNote(seed = 0) { this.defeatSting(seed); }

  /** Legendary signature — a short motif hashed from the card id, so a given legendary always sounds like itself. */
  legendaryMotif(cardId: string) {
    if (this._muted) return;
    this.legendaryAccent();
    this.procLegendaryMotif(cardId);
  }

  // ───────────────────────────────────────────────────────────────────
  // Procedural fallbacks (the original v1 patches)
  // ───────────────────────────────────────────────────────────────────

  private procPaperSlide() {
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

  private procPenScratch() {
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

  private procStampThunk() {
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
    const click = ctx.createBufferSource();
    click.buffer = this.noiseBuffer(ctx, 0.03);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.25, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    click.connect(cg).connect(master);
    click.start(t);
  }

  private procPop(from: number, to: number, vol: number) {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + 0.07);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  private procPageTear() {
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

  private procVictoryDing(seed = 0) {
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

  private procDefeatNote(seed = 0) {
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

  private procLegendaryMotif(cardId: string) {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const t0 = ctx.currentTime + 0.25; // after the bell hit
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
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(65, t0);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.35, t0);
    tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    thump.connect(tg).connect(master);
    thump.start(t0);
    thump.stop(t0 + 0.2);
    const notes = [
      scale[0],
      scale[pick(10, scale.length)],
      scale[pick(13, scale.length)],
      scale[pick(16, scale.length)],
      pick(19, 2) === 1 ? 12 : 0,
    ];
    notes.forEach((semis, i) => {
      const oct = pick(21 + i, 4) === 3 ? 12 : 0;
      const t = t0 + 0.06 + i * step;
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.value = root * 2 ** ((semis + oct) / 12);
      osc.detune.value = pick(26 + i, 9) - 4;
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

// ── Global gesture wiring ──────────────────────────────────────────────
// One document-level listener: unlocks audio on the first interaction and
// gives every button a soft tactile tick. Installed once per page load.
if (typeof window !== "undefined" && !("__inkduelSoundWired" in window)) {
  (window as unknown as { __inkduelSoundWired: boolean }).__inkduelSoundWired = true;
  window.addEventListener("pointerdown", () => sound.prime(), { capture: true, passive: true });
  window.addEventListener(
    "click",
    (e) => {
      const el = e.target instanceof Element ? e.target.closest("button, a, [role='button']") : null;
      const btn = el as HTMLButtonElement | null;
      if (btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true") sound.click();
    },
    { capture: true },
  );
}

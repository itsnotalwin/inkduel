/**
 * Narrated voice lines — file-based audio assets bundled with the app and
 * precached by the service worker. After the first visit, every line loads
 * from cache instantly: zero network delay, works offline.
 *
 * Audio elements are cached per (line, voice) so a replayed line reuses the
 * same buffered element instead of re-fetching. The prologue's scene driver
 * uses `playVoiceWithEnd` to cut scenes exactly when the narrator stops.
 */
import manifest from "@/data/voice-lines.json";
import { sound } from "@/lib/sound";

/** Pages deploys live under /inkduel — asset URLs must carry the basePath. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const VOICE_PREF_KEY = "inkduel:voice";
const PROLOGUE_VOICE_PREF_KEY = "inkduel:prologueVoice";

/** The cast narrators, in manifest order. */
export const VOICES = manifest.voices.map((v) => ({ key: v.key, label: v.label }));

/** The narrator who reads until the player casts another. */
export const DEFAULT_VOICE: string = manifest.narratorDefault;

/** The prologue script, in playback order. */
export const PROLOGUE_LINE_IDS = manifest.lines
  .filter((line) => line.group === "prologue")
  .map((line) => line.id);

/** The persisted narrator choice (default: the manifest's narratorDefault). */
export function readVoicePref(): string {
  if (typeof window === "undefined") return DEFAULT_VOICE;
  const saved = window.localStorage.getItem(VOICE_PREF_KEY);
  return saved && VOICES.some((v) => v.key === saved) ? saved : DEFAULT_VOICE;
}

export function setVoicePref(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VOICE_PREF_KEY, key);
}

/** Prologue-local narration switch (default on) so rewatches can be silent. */
export function readPrologueVoicePref(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(PROLOGUE_VOICE_PREF_KEY) !== "0";
}

export function setPrologueVoicePref(on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROLOGUE_VOICE_PREF_KEY, on ? "1" : "0");
}

/** Per-voice file extension from the manifest (msedge = mp3, heygen = wav). */
const VOICE_EXT = new Map<string, string>(
  manifest.voices.map((v) => [v.key, (v as { ext?: string }).ext ?? "mp3"]),
);

function voiceUrl(id: string, voiceKey: string): string {
  return `${BASE_PATH}/voice/${id}.${voiceKey}.${VOICE_EXT.get(voiceKey) ?? "mp3"}`;
}

// ── Audio element cache ────────────────────────────────────────────────
// Each (line, voice) pair gets ONE Audio element, loaded once. Replaying
// the same line in the same voice seeks to 0 and plays — no re-fetch.

const audioCache = new Map<string, HTMLAudioElement>();

function getVoiceAudio(id: string, voiceKey: string): HTMLAudioElement {
  const cacheKey = `${id}.${voiceKey}`;
  if (!audioCache.has(cacheKey)) {
    const audio = new Audio(voiceUrl(id, voiceKey));
    audio.preload = "auto";
    audio.load();
    audioCache.set(cacheKey, audio);
  }
  return audioCache.get(cacheKey)!;
}

// the line currently playing — a new play cuts the old one off mid-sentence
let current: HTMLAudioElement | null = null;

/** Stop the playing line, if any. */
export function stopVoice(): void {
  current?.pause();
  current = null;
}

/**
 * Play a narrated line in the given voice (default: the cast preference).
 * Uses the cached Audio element — instant playback from cache. No-op while
 * globally muted; 404s and autoplay rejections are swallowed.
 */
export function playVoice(id: string, voiceKey?: string): void {
  playVoiceWithEnd(id, voiceKey, undefined);
}

/**
 * Play a narrated line and fire `onEnded` exactly when the audio finishes —
 * the prologue's scenes hold until their narrator stops talking, so voice and
 * picture stay locked. `onEnded` also fires on audio errors (a missing file
 * must never stall the film); pausing (a new line cutting this one) does not.
 */
export function playVoiceWithEnd(
  id: string,
  voiceKey: string | undefined,
  onEnded?: () => void,
): void {
  if (typeof window === "undefined") {
    onEnded?.();
    return;
  }
  if (sound.muted) {
    onEnded?.();
    return;
  }
  stopVoice();
  const voice = voiceKey ?? readVoicePref();
  const audio = getVoiceAudio(id, voice);
  audio.currentTime = 0;
  audio.volume = 0.9;
  current = audio;
  const done = () => {
    if (current === audio) current = null;
    onEnded?.();
  };
  audio.addEventListener("ended", done, { once: true });
  audio.addEventListener("error", done, { once: true });
  audio.play().catch(() => {
    if (current === audio) current = null;
    onEnded?.();
  });
}

/**
 * Warm the cache for a batch of lines — creates and loads the Audio elements
 * so `playVoiceWithEnd` finds them pre-buffered. Returns a promise that
 * resolves when all requested lines have fired `canplaythrough` (or errored).
 */
export function preloadVoices(ids: string[], voiceKey?: string): Promise<void[]> {
  if (typeof window === "undefined") return Promise.resolve([]);
  const voice = voiceKey ?? readVoicePref();
  return Promise.all(
    ids.map(
      (id) =>
        new Promise<void>((resolve) => {
          const audio = getVoiceAudio(id, voice);
          if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            resolve();
            return;
          }
          audio.addEventListener("canplaythrough", () => resolve(), { once: true });
          audio.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

/** Backwards-compatible alias — now also warms the cache. */
export function preloadVoice(ids: string[], voiceKey?: string): void {
  void preloadVoices(ids, voiceKey);
}

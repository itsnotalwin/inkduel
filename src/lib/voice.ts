/**
 * Narrated voice lines — the game's first file-based audio assets (everything
 * else is procedural WebAudio). Files live at public/voice/<id>.<voiceKey>.mp3
 * and stream lazily from the network (never precached by the service worker):
 * a missing file, an offline reader, or an autoplay-policy rejection is simply
 * silent — narration is a progressive enhancement, never a requirement.
 */
import manifest from "@/data/voice-lines.json";
import { sound } from "@/lib/sound";

/** Pages deploys live under /inkduel — asset URLs must carry the basePath. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const VOICE_PREF_KEY = "inkduel:voice";
const PROLOGUE_VOICE_PREF_KEY = "inkduel:prologueVoice";

/** The four cast narrators, in manifest order. */
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

// the line currently playing — a new play cuts the old one off mid-sentence
let current: HTMLAudioElement | null = null;

/** Stop the playing line, if any. */
export function stopVoice(): void {
  current?.pause();
  current = null;
}

/** Per-voice file extension from the manifest (msedge = mp3, heygen = wav). */
const VOICE_EXT = new Map<string, string>(
  manifest.voices.map((v) => [v.key, (v as { ext?: string }).ext ?? "mp3"]),
);

function voiceUrl(id: string, voiceKey: string): string {
  return `${BASE_PATH}/voice/${id}.${voiceKey}.${VOICE_EXT.get(voiceKey) ?? "mp3"}`;
}

/**
 * Play a narrated line in the given voice (default: the cast preference).
 * No-op while globally muted (same source of truth as the dueling table);
 * 404s and autoplay rejections are swallowed — if there is no user gesture
 * yet, the line is simply missed.
 */
export function playVoice(id: string, voiceKey?: string): void {
  if (typeof window === "undefined" || sound.muted) return;
  stopVoice();
  const audio = new Audio(voiceUrl(id, voiceKey ?? readVoicePref()));
  audio.volume = 0.9;
  current = audio;
  audio.addEventListener("ended", () => {
    if (current === audio) current = null;
  });
  audio.play().catch(() => {
    if (current === audio) current = null;
  });
}

/** Best-effort cache warm for lines about to be needed — failures are fine. */
export function preloadVoice(ids: string[], voiceKey?: string): void {
  if (typeof window === "undefined") return;
  const voice = voiceKey ?? readVoicePref();
  for (const id of ids) {
    const audio = new Audio(voiceUrl(id, voice));
    audio.preload = "auto";
    audio.load();
  }
}

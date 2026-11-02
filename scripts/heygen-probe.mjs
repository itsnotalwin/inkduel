/**
 * HeyGen probe — reads HEYGEN_API_KEY from .env (never prints it):
 *  1. GET /v3/users/me            → identity + wallet balance
 *  2. GET /v3/models/audio/voices?type=public → public voice lineup for the tester
 *  3. POST /v3/models/audio/tts   → one free-tier line (heygen-voice-1-turbo-free, Nadine)
 * Saves the generated audio to public/voice/heygen-test.wav (endpoint always returns WAV).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const KEY = readFileSync(".env", "utf8").match(/^HEYGEN_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) {
  console.error("HEYGEN_API_KEY not found in .env");
  process.exit(1);
}
const headers = { "X-Api-Key": KEY, "Content-Type": "application/json" };

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fn();
    if (res.status !== 429) return res;
    const wait = Number(res.headers.get("retry-after") ?? "") || attempt * 5;
    console.log(`${label}: 429 rate-limited (shared free capacity) — waiting ${wait}s (attempt ${attempt}/3)`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  return null;
}

console.log("--- GET /v3/users/me ---");
const me = await fetch("https://api.heygen.com/v3/users/me", { headers });
const meBody = await me.json().catch(() => null);
if (!me.ok) {
  console.log("error:", JSON.stringify(meBody).slice(0, 400));
  process.exit(1);
}
const wallet = meBody?.data?.wallet;
console.log("user:", meBody?.data?.username ?? "(id-only)", "| balance:", wallet?.remaining_balance, wallet?.currency);

console.log("\n--- GET /v3/models/audio/voices?type=public (first page) ---");
const voicesRes = await fetch("https://api.heygen.com/v3/models/audio/voices?type=public", { headers });
const voicesBody = await voicesRes.json().catch(() => null);
if (voicesRes.ok) {
  const voices = voicesBody?.data?.voices ?? voicesBody?.data ?? [];
  console.log("public voices returned:", Array.isArray(voices) ? voices.length : "(unknown shape)");
  for (const v of (Array.isArray(voices) ? voices : []).slice(0, 12)) {
    console.log("-", v.voice_id, "|", v.name ?? v.voice_name, "|", v.language ?? "", "|", v.gender ?? "");
  }
} else {
  console.log("voices list error:", JSON.stringify(voicesBody).slice(0, 300));
}

console.log("\n--- POST /v3/models/audio/tts (heygen-voice-1-turbo-free, Nadine) ---");
const body = JSON.stringify({
  model: "heygen-voice-1-turbo-free",
  voice_id: "83548de556df48ba8c09c42a57c51d85", // Nadine (public voice, per docs)
  text: "The Grand Archive accepts your challenge. Every story here starts with a blank page.",
  language: "en",
  expressiveness_boost: 0.8,
});
const ttsRes = (await withRetry(() => fetch("https://api.heygen.com/v3/models/audio/tts", { method: "POST", headers, body }), "tts")) ?? null;
if (!ttsRes) {
  console.log("tts: still rate-limited after retries");
  process.exit(1);
}
const ttsBody = await ttsRes.json().catch(() => null);
if (!ttsRes.ok) {
  console.log("tts error:", JSON.stringify(ttsBody).slice(0, 600));
  process.exit(1);
}
const audioUrl = ttsBody?.data?.audio_url;
console.log("duration:", ttsBody?.data?.duration, "s | audio_url received");
const audio = await fetch(audioUrl);
const buf = Buffer.from(await audio.arrayBuffer());
mkdirSync("public/voice", { recursive: true });
writeFileSync("public/voice/heygen-test.wav", buf);
console.log("saved public/voice/heygen-test.wav |", buf.length, "bytes | WAV header:", buf.slice(0, 4).toString("latin1") === "RIFF" ? "ok" : "UNEXPECTED");

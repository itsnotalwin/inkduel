#!/usr/bin/env node
/**
 * voicegen.mjs — TTS generation pipeline for INKDUEL voice lines.
 *
 * Reads the manifest at src/data/voice-lines.json (the contract: 4 voices x
 * 10 lines) and writes MP3 assets to public/voice/<id>.<voiceKey>.mp3.
 *
 * Providers:
 *   msedge      (default, no API key) — Microsoft Edge Read Aloud API via
 *               the `msedge-tts` package, using each voice's "msedge" name.
 *   openrouter  (opt-in: --provider=openrouter) — OpenRouter chat completions
 *               with model openai/gpt-audio-mini, using each voice's
 *               "openrouter" name. Requires OPENROUTER_API_KEY.
 *
 * Usage:
 *   node scripts/voicegen.mjs
 *   node scripts/voicegen.mjs --provider=openrouter --only=prologue-1
 *
 * Flags:
 *   --provider=<msedge|openrouter>   provider to use (default: msedge)
 *   --only=<line-id>                 generate a single line (e.g. prologue-1)
 *   --force                          regenerate even if output exists and is >10KB
 *
 * Skip-and-resume: an output file that already exists and is >10KB is skipped
 * unless --force. A summary table is printed at the end.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(ROOT, "src", "data", "voice-lines.json");
const OUT_DIR = path.join(ROOT, "public", "voice");
const MIN_BYTES = 10 * 1024; // files at or below this are treated as missing/invalid

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-audio-mini";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const usage = () => {
  console.error("Usage: node scripts/voicegen.mjs [--provider=msedge|heygen|openrouter] [--only=<line-id>] [--force]");
};

let provider = "msedge";
let only = null;
let force = false;

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--provider=")) {
    provider = arg.slice("--provider=".length);
  } else if (arg.startsWith("--only=")) {
    only = arg.slice("--only=".length);
  } else if (arg === "--force") {
    force = true;
  } else {
    console.error(`Unknown argument: ${arg}`);
    usage();
    process.exit(2);
  }
}

if (!["msedge", "heygen", "openrouter"].includes(provider)) {
  console.error(`Unknown provider: ${provider} (expected msedge, heygen or openrouter)`);
  usage();
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const allLines = manifest.lines;
const lines = only ? allLines.filter((l) => l.id === only) : allLines;

if (only && lines.length === 0) {
  console.error(`--only=${only}: no line with that id in the manifest.`);
  console.error(`Available ids: ${allLines.map((l) => l.id).join(", ")}`);
  process.exit(2);
}

// Every generatable (line, voice) pair — used for end-of-run verification.
const allExpectedFiles = manifest.lines.flatMap((line) =>
  manifest.voices.map((voice) => `${line.id}.${voice.key}.${voice.ext ?? "mp3"}`),
);

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Escape text for inclusion in the SSML element body. */
const xmlEscape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function outputPathFor(lineId, voiceKey, ext = "mp3") {
  return path.join(OUT_DIR, `${lineId}.${voiceKey}.${ext}`);
}

/** Returns file size if the file is already a valid (generated) asset, else null. */
function existingValidSize(filePath) {
  try {
    const size = fs.statSync(filePath).size;
    return size > MIN_BYTES ? size : null;
  } catch {
    return null;
  }
}

const rows = []; // { file, bytes, status: "ok" | "skip" | "fail" }

function record(file, bytes, status) {
  rows.push({ file, bytes, status });
  const verb = status === "ok" ? "wrote" : status === "skip" ? "skip " : "FAIL ";
  console.log(`${verb} ${file} (${bytes} bytes)`);
}

function printSummary() {
  const width = Math.max(...rows.map((r) => r.file.length), "file".length);
  console.log("\n=== Summary ===");
  console.log(`${"file".padEnd(width)}  ${"bytes".padStart(9)}  status`);
  for (const r of rows) {
    console.log(`${r.file.padEnd(width)}  ${String(r.bytes).padStart(9)}  ${r.status}`);
  }
  const ok = rows.filter((r) => r.status === "ok").length;
  const skip = rows.filter((r) => r.status === "skip").length;
  const fail = rows.filter((r) => r.status === "fail").length;
  console.log(`\n${rows.length} file(s): ${ok} ok, ${skip} skip, ${fail} fail`);
}

/** Verify every manifest file exists and is >10KB; returns list of missing ones. */
function verifyAll() {
  const missing = allExpectedFiles.filter((f) => !existingValidSize(path.join(OUT_DIR, f)));
  if (missing.length === 0) {
    console.log(`\nVerify: all ${allExpectedFiles.length} expected files exist and are >10KB.`);
  } else {
    console.log(`\nVerify: ${missing.length}/${allExpectedFiles.length} expected file(s) MISSING or <=10KB:`);
    for (const f of missing) console.log(`  missing: ${f}`);
  }
  return missing;
}

// ---------------------------------------------------------------------------
// Provider: msedge (default)
// ---------------------------------------------------------------------------

/**
 * Buffer the msedge-tts audio stream fully before touching disk, so a failed
 * synthesis never leaves an empty/partial MP3 behind.
 */
function streamToBuffer(tts, text) {
  const { audioStream } = tts.toStream(xmlEscape(text));
  return new Promise((resolve, reject) => {
    const chunks = [];
    const onEnd = () => resolve(Buffer.concat(chunks));
    audioStream.on("data", (c) => chunks.push(c));
    audioStream.on("error", reject);
    audioStream.on("end", onEnd);
    audioStream.on("close", onEnd);
  });
}

async function generateMsEdge() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // One connection per voice; that voice's lines run sequentially on it.
  // Voices run concurrently so the whole run takes about one voice's duration.
  await Promise.all(
    manifest.voices
      .filter((voice) => voice.msedge)
      .map(async (voice) => {
      const tts = new MsEdgeTTS({ enableLogger: false });
      try {
        await tts.setMetadata(voice.msedge, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
        for (const line of lines) {
          const filePath = outputPathFor(line.id, voice.key, voice.ext ?? "mp3");
          const file = path.basename(filePath);

          const existing = existingValidSize(filePath);
          if (existing !== null && !force) {
            record(file, existing, "skip");
            continue;
          }

          try {
            const buffer = await streamToBuffer(tts, line.text);
            if (buffer.length <= MIN_BYTES) {
              throw new Error(`suspiciously small audio (${buffer.length} bytes)`);
            }
            fs.writeFileSync(filePath, buffer);
            record(file, buffer.length, "ok");
          } catch (err) {
            record(file, 0, "fail");
            console.error(`  ${file}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } finally {
        tts.close();
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// Provider: openrouter (opt-in)
// ---------------------------------------------------------------------------

/**
 * Prints a single clear line explaining the failure and exits non-zero.
 * Never touches existing files and never retries.
 */
function failOpenRouter(status, message) {
  console.error(
    `OpenRouter generation failed (HTTP ${status}: ${message}) — ` +
      `the OPENROUTER_API_KEY in this environment appears revoked or invalid; ` +
      `no files were written or deleted (msedge output in public/voice is untouched). ` +
      `Use the default provider: node scripts/voicegen.mjs`,
  );
  process.exit(1);
}

async function generateOpenRouter() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error(
      "OPENROUTER_API_KEY is not set — cannot use --provider=openrouter. " +
        "Set it in the environment, or use the default (no-key) provider: node scripts/voicegen.mjs",
    );
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const line of lines) {
    for (const voice of manifest.voices.filter((v) => v.openrouter)) {
      const filePath = outputPathFor(line.id, voice.key, "mp3");
      const file = path.basename(filePath);

      const existing = existingValidSize(filePath);
      if (existing !== null && !force) {
        record(file, existing, "skip");
        continue;
      }

      let res;
      let body;
      try {
        res = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            modalities: ["text", "audio"],
            audio: { voice: voice.openrouter, format: "mp3" },
            messages: [{ role: "user", content: `Read this exactly: ${line.text}` }],
          }),
        });
        try {
          body = await res.json();
        } catch {
          body = null;
        }
      } catch (err) {
        console.error(
          `OpenRouter request for ${file} could not be sent (${err instanceof Error ? err.message : String(err)}) — ` +
            `no files were written or deleted.`,
        );
        process.exit(1);
      }

      if (!res.ok) {
        failOpenRouter(res.status, body?.error?.message ?? res.statusText);
      }

      const base64 = body?.choices?.[0]?.message?.audio?.data;
      if (!base64) {
        console.error(
          `OpenRouter returned no audio for ${file} (model ${OPENROUTER_MODEL}) — ` +
            `check that the model supports audio output; no files were written or deleted.`,
        );
        process.exit(1);
      }

      const buffer = Buffer.from(base64, "base64");
      fs.writeFileSync(filePath, buffer);
      record(file, buffer.length, "ok");
    }
  }
}

// ---------------------------------------------------------------------------
// Provider: heygen (free turbo — needs HEYGEN_API_KEY in the env or .env)
// ---------------------------------------------------------------------------

/** The key lives in the environment when exported, or in the gitignored .env. */
function readHeyGenKey() {
  if (process.env.HEYGEN_API_KEY) return process.env.HEYGEN_API_KEY;
  try {
    return fs.readFileSync(".env", "utf8").match(/^HEYGEN_API_KEY=(.+)$/m)?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

const HEYGEN_TTS_URL = "https://api.heygen.com/v3/models/audio/tts";
const HEYGEN_FREE_MODEL = "heygen-voice-1-turbo-free";

/**
 * Sequential synthesis with 429 backoff — Turbo Free rides shared capacity,
 * so the docs' advice is to honor Retry-After and retry a few times.
 */
async function heygenTts(key, voice, text) {
  const body = JSON.stringify({
    model: HEYGEN_FREE_MODEL,
    voice_id: voice.heygen,
    text,
    language: "en",
    expressiveness_boost: 0.8,
  });
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(HEYGEN_TTS_URL, {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body,
    });
    if (res.status !== 429) return res;
    const wait = Number(res.headers.get("retry-after") ?? "") || attempt * 8;
    console.log(`  429 (shared capacity) — waiting ${wait}s (attempt ${attempt}/4)`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  return null;
}

async function generateHeyGen() {
  const key = readHeyGenKey();
  if (!key) {
    console.error(
      "HEYGEN_API_KEY is neither set in the environment nor in .env — cannot use --provider=heygen. " +
        "Get a key at https://app.heygen.com/settings?nav=API, or use the default (no-key) provider: node scripts/voicegen.mjs",
    );
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const voices = manifest.voices.filter((v) => v.heygen);

  for (const voice of voices) {
    for (const line of lines) {
      const filePath = outputPathFor(line.id, voice.key, voice.ext ?? "wav");
      const file = path.basename(filePath);

      const existing = existingValidSize(filePath);
      if (existing !== null && !force) {
        record(file, existing, "skip");
        continue;
      }

      const res = await heygenTts(key, voice, line.text);
      if (!res) {
        record(file, 0, "fail");
        console.error(`  ${file}: still rate-limited after retries`);
        continue;
      }
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        record(file, 0, "fail");
        console.error(`  ${file}: HTTP ${res.status} ${JSON.stringify(body?.error ?? body).slice(0, 200)}`);
        continue;
      }
      const audioUrl = body?.data?.audio_url;
      if (!audioUrl) {
        record(file, 0, "fail");
        console.error(`  ${file}: no audio_url in response ${JSON.stringify(body).slice(0, 200)}`);
        continue;
      }
      const audio = await fetch(audioUrl);
      const buffer = Buffer.from(await audio.arrayBuffer());
      if (buffer.length <= MIN_BYTES) {
        record(file, 0, "fail");
        console.error(`  ${file}: suspiciously small audio (${buffer.length} bytes)`);
        continue;
      }
      fs.writeFileSync(filePath, buffer);
      record(file, buffer.length, "ok");
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`voicegen: provider=${provider}${only ? ` only=${only}` : ""}${force ? " force" : ""} — ${lines.length} line(s) x ${manifest.voices.length} voice(s)`);

try {
  if (provider === "msedge") {
    await generateMsEdge();
  } else if (provider === "heygen") {
    await generateHeyGen();
  } else {
    await generateOpenRouter();
  }
} catch (err) {
  console.error(`Generation aborted: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

printSummary();

const targetsFailed = rows.some((r) => r.status === "fail");
if (provider === "msedge") {
  const missing = verifyAll();
  if (targetsFailed || (!only && missing.length > 0)) process.exit(1);
} else if (targetsFailed) {
  process.exit(1);
}

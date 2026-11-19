/**
 * Audio asset fetcher for INKDUEL.
 * Downloads CC0 audio into public/sfx and public/music.
 * Usage: node scripts/audio-fetch.mjs <list|fetch> [args...]
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

async function get(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*" }, redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (dest) {
    mkdirSync(join(dest, ".."), { recursive: true });
    writeFileSync(dest, buf);
    console.log(`OK ${(buf.length / 1024).toFixed(0)}KB -> ${dest}`);
    return null;
  }
  return buf;
}

async function searchOga(keys) {
  const url = `https://opengameart.org/art-search-advanced?keys=${encodeURIComponent(keys)}`;
  const buf = await get(url);
  const html = buf.toString("utf8");
  const seen = new Set();
  for (const m of html.matchAll(/<a href="(\/content\/[^"]+)"[^>]*>([^<]{3,90})</g)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    console.log(m[1], "|", m[2].trim());
  }
}

const cmd = process.argv[2];
const arg = process.argv[3];

if (cmd === "oga") {
  await searchOga(arg);
} else if (cmd === "fetch") {
  // args: url dest
  await get(arg, process.argv[4]);
} else if (cmd === "ogafiles") {
  // list file links on an OGA content page
  const buf = await get(arg);
  const html = buf.toString("utf8");
  for (const m of html.matchAll(/<a href="([^"]+\.(?:zip|ogg|mp3|wav|oga))"[^>]*>([^<]*)</gi)) {
    console.log(m[1], "|", m[2].trim());
  }
} else {
  console.log("commands: oga <query> | ogafiles <content-url> | fetch <url> <dest>");
}

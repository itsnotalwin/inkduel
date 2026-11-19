import { mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const urls = [
  "https://opengameart.org/sites/default/files/kenney_interfaceSounds.zip",
  "https://opengameart.org/sites/default/files/kenney_casino-audio.zip",
  "https://opengameart.org/sites/default/files/Cardsounds.zip",
  "https://opengameart.org/sites/default/files/BookFlip_SFX.zip",
  "https://opengameart.org/sites/default/files/sounds_6.zip",
  "https://opengameart.org/sites/default/files/100-CC0-SFX_0.zip",
];
mkdirSync("tmp-audio/packs", { recursive: true });

await Promise.all(urls.map(async (url) => {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const dest = join("tmp-audio", "packs", basename(url));
    writeFileSync(dest, buf);
    console.log(`OK ${(buf.length / 1024).toFixed(0)}KB ${basename(url)}`);
  } catch (e) {
    console.log(`FAIL ${basename(url)}: ${e.message}`);
  }
}));

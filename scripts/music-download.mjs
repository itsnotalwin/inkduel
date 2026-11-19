import { mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126";
// name -> url (all CC0, see ATTRIBUTIONS in public/audio)
const tracks = {
  "menu.wav": "https://opengameart.org/sites/default/files/main_screen.wav",
  "duel.ogg": "https://opengameart.org/sites/default/files/hope_orchestral_battle_music_bpm165_0.ogg",
  "draft.ogg": "https://opengameart.org/sites/default/files/forest_2_0.ogg",
  "victory.ogg": "https://opengameart.org/sites/default/files/winneris_0.ogg",
  "defeat.mp3": "https://opengameart.org/sites/default/files/at%20the%20end%20of%20hope_0.mp3",
};
mkdirSync("tmp-audio/music-src", { recursive: true });

await Promise.all(Object.entries(tracks).map(async ([name, url]) => {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join("tmp-audio", "music-src", name), buf);
    console.log(`OK ${(buf.length / 1024).toFixed(0)}KB ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
  }
}));

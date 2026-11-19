/**
 * Build the INKDUEL audio bundle: select CC0 sources, convert to universal MP3,
 * normalize loudness, trim loop tails. Sources (all CC0 / public domain):
 *  - kenney_interfaceSounds (Kenney, CC0)     — UI clicks/confirm/error/toggles
 *  - kenney_casino-audio (Kenney, CC0)       — card foley: slides, places, shuffle, packs
 *  - 100 CC0 SFX (Lokif, CC0)                — hits, splashes, slams, bells, plops
 *  - Various Paper Sound Effects (Sound Holder? CC0 via OGA "sounds_6") — paper crush
 *  - Card Game sounds (Cockatrice, CC0)      — spare (not used)
 *  - BookFlip_SFX (Sergey, CC0)              — spare (not used)
 * Music (all CC0):
 *  - "Main Menu Theme - Diamond Dust" by blancon (OGA main_screen.wav)
 *  - "Hope — Orchestral Battle Music" (OGA hope_orchestral_battle_music_bpm165.ogg)
 *  - "Cathedral in the forest" by JohnBuhr (OGA forest_2.ogg)
 *  - "And the winner is" (OGA winneris.ogg)
 *  - "At the end of hope" by Sunville? (OGA at the end of hope_0.mp3)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FFMPEG = "ffmpeg";
const SRC = {
  iface: "tmp-audio/packs/kenney_interfaceSounds/Audio",
  casino: "tmp-audio/packs/kenney_casino-audio/Audio",
  sfx100: "tmp-audio/packs/100-CC0-SFX_0",
  paper: "tmp-audio/packs/sounds_6/MP3",
  music: "tmp-audio/music-src",
};

// event -> [source file, target name, kind]
const SFX = [
  ["iface/click_002.ogg", "click"],
  ["iface/select_002.ogg", "select"],
  ["iface/confirmation_002.ogg", "confirm"],
  ["iface/error_004.ogg", "error"],
  ["iface/toggle_002.ogg", "toggle"],
  ["iface/maximize_007.ogg", "panel-open"],
  ["iface/minimize_007.ogg", "panel-close"],
  ["iface/back_002.ogg", "back"],
  ["iface/tick_001.ogg", "tick"],
  ["casino/card-slide-3.ogg", "draw"],
  ["casino/card-place-2.ogg", "play-unit"],
  ["casino/card-shove-1.ogg", "play-spell"],
  ["casino/card-slide-1.ogg", "hand-select"],
  ["casino/card-shuffle.ogg", "shuffle"],
  ["casino/cards-pack-open-1.ogg", "pack-open"],
  ["casino/cards-pack-take-out-1.ogg", "pack-take"],
  ["casino/card-fan-1.ogg", "card-fan"],
  ["casino/card-place-3.ogg", "draft-pick"],
  ["sfx100/hit_02.ogg", "attack"],
  ["sfx100/splash_01.ogg", "splash"],
  ["sfx100/plop_01.ogg", "heal"],
  ["sfx100/slam_05.ogg", "stamp"],
  ["sfx100/bell_03.ogg", "legendary"],
  ["paper/Paper Crushed - 1.mp3", "death"],
];
const MUSIC = [
  ["menu.wav", "menu"],
  ["duel.ogg", "duel"],
  ["draft.ogg", "draft"],
  ["victory.ogg", "victory"],
  ["defeat.mp3", "defeat"],
];

mkdirSync("public/sfx", { recursive: true });
mkdirSync("public/music", { recursive: true });

function run(args) {
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}

for (const [src, name] of SFX) {
  const out = join("public/sfx", `${name}.mp3`);
  if (existsSync(out)) continue;
  const [pack, rest] = src.split("/");
  // mono 44.1k, -18 LUFS SFX standard; loudnorm kills DC clicks at edges
  run(["-i", join(SRC[pack], rest), "-af", "loudnorm=I=-18:TP=-1.5:LRA=9", "-ar", "44100", "-ac", "1", "-b:a", "112k", out]);
}
console.log("SFX done");

for (const [src, name] of MUSIC) {
  const out = join("public/music", `${name}.mp3`);
  if (existsSync(out)) continue;
  // stereo 128k, -20 LUFS bed level; trim trailing silence so loops feel tight
  run(["-i", join(SRC.music, src), "-af", "loudnorm=I=-20:TP=-1.5:LRA=9,silenceremove=stop_periods=-1:stop_duration=1.2:stop_threshold=-48dB,afade=t=out:st=0:d=0.001", "-ar", "44100", "-ac", "2", "-b:a", "128k", out]);
}
console.log("MUSIC done");

writeFileSync(
  "public/audio-ATTRIBUTIONS.md",
  `# INKDUEL audio attributions

Every asset below is CC0 / public domain (no attribution legally required —
this file exists to say thank you and to document provenance).

## Sound effects
- Interface clicks, confirmations, errors, toggles: **Kenney "Interface Sounds"** — kenney.nl — CC0
- Card foley (slides, places, shove, shuffle, pack open/take, fan): **Kenney "Casino Audio"** — kenney.nl — CC0
- Hit / splash / plop / slam / bell: **"100 CC0 SFX" by Lokif** — opengameart.org/content/100-cc0-sfx — CC0
- Paper crush: **"Various Paper Sound Effects"** — opengameart.org/content/various-paper-sound-effects — CC0

## Music
- Menu: **"Main Menu Theme - Diamond Dust"** — opengameart.org/content/main-menu-theme-diamond-dust — CC0
- Duel: **"Hope — Orchestral Battle Music" (165 BPM)** — opengameart.org/content/hopeorchestral-battle-music — CC0
- Draft: **"Cathedral in the forest" by JohnBuhr** — opengameart.org/content/cathedral-in-the-forest-ambient-loop — CC0
- Victory: **"And the winner is"** — opengameart.org/content/and-the-winner-is — CC0
- Defeat: **"At the end of hope"** — opengameart.org/content/at-the-end-of-hope — CC0

All files were re-encoded to MP3 (44.1 kHz, loudness-normalized).
`,
);
console.log("ATTRIBUTIONS written");

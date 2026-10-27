// Monochrome audit: every hex color in src must resolve to a palette token.
const fs = require("fs");
const path = require("path");
const allowed = new Set(["F4F1EA", "EAE5D8", "FAF7F0", "17140F", "5B564C", "A8A296", "B3402A"]);
const bad = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name !== "generated") walk(p);
      continue;
    }
    if (!/\.(tsx?|css|svg)$/.test(f.name)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const m of text.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
      if (!allowed.has(m[1].toUpperCase())) bad.push(p + ": " + m[0]);
    }
  }
}
walk("src");
if (bad.length) {
  console.log("NON-PALETTE HEX FOUND:");
  for (const b of bad) console.log("  " + b);
  process.exitCode = 1;
} else {
  console.log("monochrome audit: clean");
}

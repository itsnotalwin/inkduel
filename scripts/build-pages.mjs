/**
 * Build the paper edition for GitHub Pages:
 *  1. stash src/app/api (route handlers can't statically export)
 *  2. next build with NEXT_EXPORT=1 + NEXT_PUBLIC_CLOUD=0 (+ basePath)
 *  3. restore src/app/api — always, even on failure
 * Output lands in ./out
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const apiDir = "src/app/api";
const stashDir = ".api-stash";
const hadApi = existsSync(apiDir);

// any test that imports route handlers — stash it with the api directory or
// its imports dangle while the api directory is away (auto-discovered so new
// route tests never need this list maintained)
const testStashDir = ".test-stash";
const stashedTests = existsSync("tests")
  ? readdirSync("tests")
      .filter((f) => f.endsWith(".test.ts") || f.endsWith(".test.mts"))
      .filter((f) => readFileSync(join("tests", f), "utf8").includes("@/app/api/"))
  : [];

if (hadApi) {
  rmSync(stashDir, { recursive: true, force: true });
  cpSync(apiDir, stashDir, { recursive: true });
  rmSync(apiDir, { recursive: true, force: true });
  console.log("api routes stashed");
}
if (stashedTests.length > 0) {
  rmSync(testStashDir, { recursive: true, force: true });
  for (const f of stashedTests) {
    cpSync(join("tests", f), join(testStashDir, f));
    rmSync(join("tests", f), { force: true });
  }
  console.log(`api tests stashed: ${stashedTests.length}`);
}

let code = 1;
try {
  // the full-stack build's TS incremental cache lies about the stashed file
  // set — clear it so the type check sees the stash honestly
  for (const p of [".next/tsconfig.tsbuildinfo", ".next/cache/tsbuildinfo"]) {
    rmSync(p, { recursive: true, force: true });
  }
  const result = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      NEXT_EXPORT: "1",
      NEXT_PUBLIC_CLOUD: "0",
      NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH ?? "/inkduel",
    },
  });
  code = result.status ?? 1;
} finally {
  if (hadApi) {
    rmSync(apiDir, { recursive: true, force: true });
    cpSync(stashDir, apiDir, { recursive: true });
    rmSync(stashDir, { recursive: true, force: true });
    console.log("api routes restored");
  }
  if (stashedTests.length > 0) {
    for (const f of stashedTests) {
      rmSync(join("tests", f), { force: true });
      cpSync(join(testStashDir, f), join("tests", f));
    }
    rmSync(testStashDir, { recursive: true, force: true });
    console.log("api tests restored");
  }
}

if (code === 0) {
  // inject every hashed asset + every voice file into the SW precache list.
  // Voices are part of the app — downloaded once, served from cache forever.
  const assets = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (statSync(p).isFile()) assets.push("./" + relative("out", p).replace(/\\/g, "/"));
    }
  };
  walk(join("out", "_next"));
  walk(join("out", "voice"));
  for (const extra of ["icon.svg", "favicon.ico"]) {
    if (existsSync(join("out", extra))) assets.push("./" + extra);
  }
  const swPath = join("out", "sw.js");
  const sw = readFileSync(swPath, "utf8");
  writeFileSync(swPath, sw.replace("/*__ASSETS__*/[]", JSON.stringify(assets)));
  const voiceCount = assets.filter((a) => a.includes("/voice/")).length;
  console.log(`service worker precache injected: ${assets.length} assets (${voiceCount} voice files)`);
}

process.exit(code);

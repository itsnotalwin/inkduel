/**
 * Build the paper edition for GitHub Pages:
 *  1. stash src/app/api (route handlers can't statically export)
 *  2. next build with NEXT_EXPORT=1 + NEXT_PUBLIC_CLOUD=0 (+ basePath)
 *  3. restore src/app/api — always, even on failure
 * Output lands in ./out
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const apiDir = "src/app/api";
const stashDir = ".api-stash";
const hadApi = existsSync(apiDir);

if (hadApi) {
  rmSync(stashDir, { recursive: true, force: true });
  cpSync(apiDir, stashDir, { recursive: true });
  rmSync(apiDir, { recursive: true, force: true });
  console.log("api routes stashed");
}

let code = 1;
try {
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
}

process.exit(code);

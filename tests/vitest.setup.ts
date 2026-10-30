// Runs before any test module loads: db.ts reads INKDUEL_DB at import time,
// so the API tests' Prisma client must already point at a throwaway file.
import os from "node:os";
import path from "node:path";

process.env.INKDUEL_DB = path
  .join(os.tmpdir(), `inkduel-vitest-${process.pid}-${Date.now()}.db`)
  .replace(/\\/g, "/");

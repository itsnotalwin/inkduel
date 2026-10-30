// Prisma config for the API contract tests: targets the throwaway database
// that tests/vitest.setup.ts points INKDUEL_DB at, never prisma/dev.db.
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  engine: "classic",
  datasource: {
    url: `file:${process.env.INKDUEL_DB}`,
  },
});

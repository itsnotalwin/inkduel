import type { NextConfig } from "next";

/**
 * Two build targets:
 *  - default: the full-stack edition (Next server + Prisma + SQLite).
 *  - NEXT_EXPORT=1: the paper edition for GitHub Pages — static export,
 *    no API routes (scripts/build-pages.mjs stashes src/app/api during build),
 *    all persistence on localStorage via NEXT_PUBLIC_CLOUD=0.
 */
const isPages = process.env.NEXT_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isPages
    ? { output: "export" as const, basePath: process.env.NEXT_PUBLIC_BASE_PATH || "" }
    : {}),
  images: { unoptimized: true },
  cacheComponents: !isPages,
  partialPrefetching: !isPages,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

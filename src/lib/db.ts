import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Absolute SQLite URL so the CLI, dev server and production share one file. */
export const DATABASE_URL = `file:${path.resolve(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/")}`;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: DATABASE_URL } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

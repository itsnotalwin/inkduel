import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import type { Player } from "@/generated/prisma/client";

export const SESSION_COOKIE = "inkduel_session";

/** Read the session cookie and return the player, or null. */
export async function getSessionPlayer(): Promise<Player | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const player = await prisma.player.findUnique({ where: { sessionToken: token } });
  return player;
}

/** Assign a fresh session token and set the httpOnly cookie. */
export async function startSession(playerId: string): Promise<string> {
  const token = randomUUID();
  await prisma.player.update({ where: { id: playerId }, data: { sessionToken: token, lastSeenAt: new Date() } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return token;
}

/** JSON envelope helper: {ok, data|error}. */
export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, init);
}

export function fail(error: string, status = 400): Response {
  return Response.json({ ok: false, error }, { status });
}

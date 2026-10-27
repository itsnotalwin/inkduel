"use client";

/**
 * Typed client helpers for the INKDUEL API ({ok, data|error} envelope).
 *
 * Two editions:
 *  - CLOUD (default): the full stack — Prisma, server Elo, achievements, replays.
 *  - PAPER (NEXT_PUBLIC_CLOUD=0, used for GitHub Pages): everything runs on
 *    localStorage with the same pure logic the server uses (deck validation,
 *    Elo, achievement evaluation). The game itself is client-side either way.
 */

import { ACHIEVEMENTS, legendaryUnlocks } from "@/lib/achievements";
import { eloDelta, type MatchResult } from "@/lib/elo";
import { questForDate, todayKey, QUEST_TEMPLATES } from "@/lib/quests";
import { ARCHETYPE_DECKS, COLLECTIBLE_CARDS } from "@/game/cards";
import { randomDeck } from "@/game/decks";
import { STARTING_MMR } from "@/config";

export const CLOUD = process.env.NEXT_PUBLIC_CLOUD !== "0";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = (await res.json()) as ApiEnvelope<T>;
    if (!body.ok) return null;
    return body.data ?? null;
  } catch {
    return null;
  }
}

// ── localStorage primitives (paper edition) ─────────────────────────────

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

interface LocalProfile {
  name: string;
  mmr: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  bestStreak: number;
}

const PROFILE_KEY = "inkduel:profile";
const MATCHES_KEY = "inkduel:localMatches";
const DECKS_KEY = "inkduel:localDecks";

function localProfile(): LocalProfile {
  const p = read<LocalProfile | null>(PROFILE_KEY, null);
  if (p) return p;
  const name =
    typeof window !== "undefined"
      ? window.localStorage.getItem("inkduel:name") ?? `Scribe-${Math.floor(1000 + Math.random() * 9000)}`
      : "Scribe";
  const fresh: LocalProfile = { name, mmr: STARTING_MMR, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0 };
  write(PROFILE_KEY, fresh);
  return fresh;
}

// ── shared DTOs ─────────────────────────────────────────────────────────

export interface MeProfile {
  id: string;
  name: string;
  mmr: number;
  rank: { key: string; name: string; min: number };
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  winRate: number;
  streak: number;
  bestStreak: number;
  achievements: {
    key: string;
    name: string;
    description: string;
    icon: string;
    unlocksCard: string | null;
    unlocked: boolean;
  }[];
  collection: {
    id: string;
    name: string;
    type: "unit" | "spell";
    cost: number;
    attack?: number;
    health?: number;
    rarity: string;
    owned: boolean;
  }[];
}

export interface DeckDto {
  id: string;
  name: string;
  cards: { cardId: string; count: number }[];
  isCustom: boolean;
  isActive: boolean;
}

export interface MatchDto {
  id: string;
  opponentKey: string;
  result: "WIN" | "LOSS" | "DRAW";
  playerHpLeft: number;
  botHpLeft: number;
  turns: number;
  playerMmrBefore: number;
  playerMmrAfter: number;
  botMmr: number;
  durationMs: number;
  createdAt: string;
  maxTurnDamage: number;
  maxTurnKills: number;
  tookFatigue: boolean;
  hasActions?: boolean;
}

export interface ReplayAction {
  type: "MULLIGAN" | "PLAY_CARD" | "ATTACK" | "END_TURN";
  side: string;
  uid?: string;
  attackerUid?: string;
  target?: { uid?: string; hero?: string };
  uids?: string[];
}

export interface MatchDetail extends MatchDto {
  seed: number;
  deckUsed: { cardId: string; count: number }[];
  actions: ReplayAction[] | null;
  actionLog: { turn: number; side: string; text: string }[] | null;
}

export interface QuestDto {
  key: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  date: string;
}

export interface LeaderboardRow {
  position: number;
  id: string;
  name: string;
  mmr: number;
  rank: string;
  wins: number;
  losses: number;
  isBot: boolean;
}

export interface MetaCard {
  cardId: string;
  name: string;
  cost: number;
  rarity: string;
  type: string;
  gamesPlayed: number;
  winRate: number;
}

export interface MetaData {
  totalMatches: number;
  averageTurns: number;
  averageDurationMs: number;
  topPlayed: MetaCard[];
  bestWinRate: MetaCard[];
  longestMatches: { turns: number; result: string; opponentKey: string; createdAt: string }[];
  costBuckets: { cost: number; card: { cardId: string; name: string; gamesPlayed: number } | null }[];
  cards: MetaCard[];
}

export interface MatchPostResult {
  mmrBefore: number;
  mmrAfter: number;
  mmrDelta: number;
  rankBefore: string;
  rankAfter: string;
  newAchievements: { key: string; name: string; description: string; unlocksCard: string | null }[];
  unlockedCards: string[];
  opponentMmr: number;
}

// ── paper-edition helpers ───────────────────────────────────────────────

function rankNameFor(mmr: number): string {
  const ranks: [number, string][] = [
    [2000, "INK MASTER"],
    [1800, "Obsidian"],
    [1600, "Platinum"],
    [1400, "Gold"],
    [1200, "Silver"],
    [1000, "Bronze"],
  ];
  for (const [min, name] of ranks) if (mmr >= min) return name;
  return "Wood";
}

function localAchievementKeys(matches: MatchDto[], profile: LocalProfile, customDeckCount: number): Set<string> {
  const held = new Set<string>();
  const totals = matches.reduce(
    (acc, m) => {
      acc.wins += m.result === "WIN" ? 1 : 0;
      acc.losses += m.result === "LOSS" ? 1 : 0;
      acc.draws += m.result === "DRAW" ? 1 : 0;
      acc.maxTurnDamage = Math.max(acc.maxTurnDamage, m.maxTurnDamage);
      acc.maxTurnKills = Math.max(acc.maxTurnKills, m.maxTurnKills);
      if (m.result === "WIN" && m.tookFatigue) acc.tookFatigueWin = true;
      if (m.result === "WIN" && m.turns <= 8) acc.fastWin = true;
      if (m.result === "WIN" && m.playerHpLeft === 1) acc.lastPageWin = true;
      return acc;
    },
    { wins: 0, losses: 0, draws: 0, maxTurnDamage: 0, maxTurnKills: 0, tookFatigueWin: false, fastWin: false, lastPageWin: false },
  );
  const ctx = {
    wins: profile.wins + totals.wins,
    losses: profile.losses + totals.losses,
    draws: profile.draws + totals.draws,
    streak: profile.streak,
    bestStreak: profile.bestStreak,
    mmr: profile.mmr,
    customDeckCount,
    match: {
      opponentKey: "",
      result: "WIN" as MatchResult,
      turns: 0,
      playerHpLeft: totals.lastPageWin ? 1 : 30,
      botHpLeft: 0,
      seed: 0,
      deckUsed: [],
      durationMs: 0,
      maxTurnDamage: totals.maxTurnDamage,
      maxTurnKills: totals.maxTurnKills,
      tookFatigue: totals.tookFatigueWin,
    },
    held,
  };
  for (const a of ACHIEVEMENTS) if (!held.has(a.key) && a.check(ctx)) held.add(a.key);
  return held;
}

function localMe(): MeProfile {
  const profile = localProfile();
  const matches = read<MatchDto[]>(MATCHES_KEY, []);
  const decks = localDecks();
  const customDeckCount = decks.filter((d) => d.isCustom).length;
  const held = localAchievementKeys(matches, profile, customDeckCount);
  const legendaries = legendaryUnlocks(held);
  const total = matches.length;
  return {
    id: "local",
    name: profile.name,
    mmr: profile.mmr,
    rank: { key: "local", name: rankNameFor(profile.mmr), min: 0 },
    wins: profile.wins,
    losses: profile.losses,
    draws: profile.draws,
    matches: total,
    winRate: total > 0 ? Math.round((profile.wins / total) * 100) : 0,
    streak: profile.streak,
    bestStreak: profile.bestStreak,
    achievements: ACHIEVEMENTS.map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      unlocksCard: a.unlocksCard ?? null,
      unlocked: held.has(a.key),
    })),
    collection: COLLECTIBLE_CARDS.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      cost: c.cost,
      attack: c.attack,
      health: c.health,
      rarity: c.rarity,
      owned: c.rarity !== "legendary" || legendaries.includes(c.id),
    })),
  };
}

function localDecks(): DeckDto[] {
  let decks = read<DeckDto[]>(DECKS_KEY, []);
  if (decks.length === 0) {
    decks = Object.values(ARCHETYPE_DECKS).map((archetype, i) => ({
      id: uuid(),
      name: archetype.name,
      cards: archetype.cards.map(([cardId, count]) => ({ cardId, count })),
      isCustom: false,
      isActive: i === 0,
    }));
    write(DECKS_KEY, decks);
  }
  return decks;
}

function localMatches(): MatchDto[] {
  return read<MatchDto[]>(MATCHES_KEY, []);
}

// ── API surface ─────────────────────────────────────────────────────────

export function ensureGuest(name?: string) {
  if (!CLOUD) {
    const p = localProfile();
    if (name) {
      p.name = name;
      write(PROFILE_KEY, p);
    }
    return Promise.resolve({ id: "local", name: p.name, mmr: p.mmr });
  }
  return request<{ id: string; name: string; mmr: number }>("/api/auth/guest", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getMe(): Promise<MeProfile | null> {
  if (!CLOUD) return Promise.resolve(localMe());
  return request<MeProfile>("/api/me");
}

export function getDecks(): Promise<DeckDto[] | null> {
  if (!CLOUD) return Promise.resolve(localDecks());
  return request<DeckDto[]>("/api/decks");
}

export function createDeck(name: string, cards: { cardId: string; count: number }[]): Promise<DeckDto | null> {
  if (!CLOUD) {
    const decks = localDecks();
    const deck: DeckDto = { id: uuid(), name, cards, isCustom: true, isActive: false };
    decks.push(deck);
    write(DECKS_KEY, decks);
    return Promise.resolve(deck);
  }
  return request<DeckDto>("/api/decks", { method: "POST", body: JSON.stringify({ name, cards }) });
}

export function updateDeck(
  id: string,
  patch: { name?: string; cards?: { cardId: string; count: number }[]; isActive?: boolean },
): Promise<DeckDto | null> {
  if (!CLOUD) {
    const decks = localDecks();
    if (patch.isActive) for (const d of decks) d.isActive = d.id === id;
    const deck = decks.find((d) => d.id === id);
    if (!deck) return Promise.resolve(null);
    if (patch.name !== undefined) deck.name = patch.name;
    if (patch.cards !== undefined) deck.cards = patch.cards;
    write(DECKS_KEY, decks);
    return Promise.resolve(deck);
  }
  return request<DeckDto>(`/api/decks/${id}`, { method: "PUT", body: JSON.stringify(patch) });
}

export function deleteDeck(id: string): Promise<boolean> {
  if (!CLOUD) {
    write(DECKS_KEY, localDecks().filter((d) => d.id !== id));
    return Promise.resolve(true);
  }
  return request(`/api/decks/${id}`, { method: "DELETE" }).then((r) => !!r);
}

export function getQuestToday(): Promise<QuestDto | null> {
  const date = todayKey();
  if (!CLOUD) {
    const profile = localProfile();
    const template = questForDate(date, profile.name);
    const key = `inkduel:quest:${date}`;
    const q = read<QuestDto | null>(key, null) ?? {
      key: template.key,
      description: template.description(template.target),
      target: template.target,
      progress: 0,
      completed: false,
      date,
    };
    write(key, q);
    return Promise.resolve(q);
  }
  return request<QuestDto>("/api/quests/today");
}

export function getLeaderboard() {
  if (!CLOUD) {
    const p = localProfile();
    const ownRow: LeaderboardRow = {
      position: 1,
      id: "local",
      name: p.name,
      mmr: p.mmr,
      rank: rankNameFor(p.mmr),
      wins: p.wins,
      losses: p.losses,
      isBot: false,
    };
    return Promise.resolve({ rows: [] as LeaderboardRow[], ownRow, bots: [] });
  }
  return request<{ rows: LeaderboardRow[]; ownRow: LeaderboardRow | null; bots: { key: string; name: string; mmr: number }[] }>("/api/leaderboard");
}

export function getMatchHistory(page = 1): Promise<{ matches: MatchDto[]; page: number; pages: number; total: number } | null> {
  if (!CLOUD) {
    const all = localMatches().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const perPage = 20;
    return Promise.resolve({
      matches: all.slice((page - 1) * perPage, page * perPage),
      page,
      pages: Math.max(1, Math.ceil(all.length / perPage)),
      total: all.length,
    });
  }
  return request<{ matches: MatchDto[]; page: number; pages: number; total: number }>(`/api/matches?page=${page}`);
}

export function getMatch(id: string): Promise<MatchDetail | null> {
  if (!CLOUD) {
    const m = read<MatchDetail[]>(MATCHES_KEY, []).find((x) => x.id === id);
    return Promise.resolve(m ?? null);
  }
  return request<MatchDetail>(`/api/matches/${id}`);
}

export function getAchievements() {
  if (!CLOUD) {
    const me = localMe();
    return Promise.resolve({ achievements: me.achievements.map((a) => ({ ...a, unlockedAt: null as string | null })) });
  }
  return request<{
    achievements: {
      key: string;
      name: string;
      description: string;
      icon: string;
      unlocksCard: string | null;
      unlocked: boolean;
      unlockedAt: string | null;
    }[];
  }>("/api/achievements");
}

export function getMeta(): Promise<MetaData | null> {
  if (!CLOUD) {
    const matches = localMatches();
    const perCard = new Map<string, { played: number; wins: number }>();
    for (const m of matches) {
      const decksOf = read<MatchDetail[]>(MATCHES_KEY, []).find((x) => x.id === m.id)?.deckUsed ?? [];
      for (const entry of decksOf) {
        const cur = perCard.get(entry.cardId) ?? { played: 0, wins: 0 };
        cur.played += entry.count;
        if (m.result === "WIN") cur.wins += entry.count;
        perCard.set(entry.cardId, cur);
      }
    }
    const cards: MetaCard[] = [...perCard.entries()]
      .map(([cardId, s]): MetaCard | null => {
        const def = COLLECTIBLE_CARDS.find((c) => c.id === cardId);
        if (!def || s.played === 0) return null;
        return {
          cardId,
          name: def.name,
          cost: def.cost,
          rarity: def.rarity,
          type: def.type,
          gamesPlayed: s.played,
          winRate: Math.round((s.wins / s.played) * 100),
        };
      })
      .filter((x): x is MetaCard => x !== null);
    const turns = matches.map((m) => m.turns);
    return Promise.resolve({
      totalMatches: matches.length,
      averageTurns: turns.length ? Math.round((turns.reduce((a, b) => a + b, 0) / turns.length) * 10) / 10 : 0,
      averageDurationMs: matches.length ? Math.round(matches.reduce((a, m) => a + m.durationMs, 0) / matches.length) : 0,
      topPlayed: [...cards].sort((a, b) => b.gamesPlayed - a.gamesPlayed).slice(0, 10),
      bestWinRate: [...cards].filter((c) => c.gamesPlayed >= 3).sort((a, b) => b.winRate - a.winRate).slice(0, 10),
      longestMatches: [...matches]
        .sort((a, b) => b.turns - a.turns)
        .slice(0, 3)
        .map((m) => ({ turns: m.turns, result: m.result, opponentKey: m.opponentKey, createdAt: m.createdAt })),
      costBuckets: [],
      cards,
    });
  }
  return request<MetaData>("/api/analytics/meta");
}

/** Submit a finished match. Offline/network failure → stored locally so
 *  history, achievements and replays keep working (paper edition). */
export function postMatch(payload: {
  opponentKey: string;
  result: MatchResult;
  turns: number;
  playerHpLeft: number;
  botHpLeft: number;
  seed: number;
  durationMs?: number;
  deckUsed: { cardId: string; count: number }[];
  actionLog?: { turn: number; side: string; text: string }[];
  actions?: ReplayAction[];
  maxTurnDamage?: number;
  maxTurnKills?: number;
  tookFatigue?: boolean;
}): Promise<MatchPostResult | null> {
  if (CLOUD) {
    return request<MatchPostResult>("/api/matches", { method: "POST", body: JSON.stringify(payload) }).then((r) => {
      if (r) return r;
      return postMatchLocal(payload, null);
    });
  }
  return postMatchLocal(payload, null);
}

const BOT_MMRS: Record<string, number> = { duelist: 900, gambler: 1050, collector: 1150, archivist: 1400 };

function postMatchLocal(payload: Parameters<typeof postMatch>[0], _unused: null): Promise<MatchPostResult> {
  const profile = localProfile();
  const botMmr = BOT_MMRS[payload.opponentKey] ?? 1000;
  const { delta, newMmr } = eloDelta(profile.mmr, botMmr, payload.result);
  const streak = payload.result === "WIN" ? profile.streak + 1 : payload.result === "LOSS" ? 0 : profile.streak;
  const updated: LocalProfile = {
    ...profile,
    mmr: newMmr,
    streak,
    bestStreak: Math.max(profile.bestStreak, streak),
    wins: profile.wins + (payload.result === "WIN" ? 1 : 0),
    losses: profile.losses + (payload.result === "LOSS" ? 1 : 0),
    draws: profile.draws + (payload.result === "DRAW" ? 1 : 0),
  };
  write(PROFILE_KEY, updated);
  if (typeof window !== "undefined") window.localStorage.setItem("inkduel:mmr", String(newMmr));

  const id = uuid();
  const match: MatchDetail = {
    id,
    opponentKey: payload.opponentKey,
    result: payload.result,
    playerHpLeft: payload.playerHpLeft,
    botHpLeft: payload.botHpLeft,
    turns: payload.turns,
    playerMmrBefore: profile.mmr,
    playerMmrAfter: newMmr,
    botMmr,
    durationMs: payload.durationMs ?? 0,
    createdAt: new Date().toISOString(),
    maxTurnDamage: payload.maxTurnDamage ?? 0,
    maxTurnKills: payload.maxTurnKills ?? 0,
    tookFatigue: payload.tookFatigue ?? false,
    hasActions: (payload.actions?.length ?? 0) > 0,
    seed: payload.seed,
    deckUsed: payload.deckUsed,
    actions: payload.actions ?? null,
    actionLog: payload.actionLog ?? null,
  };
  const matches = read<MatchDetail[]>(MATCHES_KEY, []);
  matches.push(match);
  write(MATCHES_KEY, matches.slice(-100));

  // daily quest progress
  const date = todayKey();
  const template = questForDate(date, profile.name);
  const qKey = `inkduel:quest:${date}`;
  const q = read<QuestDto | null>(qKey, null) ?? {
    key: template.key,
    description: template.description(template.target),
    target: template.target,
    progress: 0,
    completed: false,
    date,
  };
  if (!q.completed) {
    const add = template.metric === "matches" ? 1 : template.metric === "wins" ? (payload.result === "WIN" ? 1 : 0) : Math.max(0, 30 - payload.botHpLeft);
    q.progress = Math.min(template.target, q.progress + add);
    q.completed = q.progress >= template.target;
    write(qKey, q);
  }

  // achievements evaluated over the updated record
  const decks = localDecks();
  const held = localAchievementKeys([match as MatchDto], updated, decks.filter((d) => d.isCustom).length);
  const before = localAchievementKeys([], profile, decks.filter((d) => d.isCustom).length);
  const fresh = [...held].filter((k) => !before.has(k));
  const unlocked = ACHIEVEMENTS.filter((a) => fresh.includes(a.key));

  return Promise.resolve({
    mmrBefore: profile.mmr,
    mmrAfter: newMmr,
    mmrDelta: delta,
    rankBefore: rankNameFor(profile.mmr),
    rankAfter: rankNameFor(newMmr),
    newAchievements: unlocked.map((a) => ({ key: a.key, name: a.name, description: a.description, unlocksCard: a.unlocksCard ?? null })),
    unlockedCards: legendaryUnlocks(fresh),
    opponentMmr: botMmr,
  });
}

/** Paper-edition helper: a locally generated random deck for the Gambler. */
export function localGamblerDeck(seed: number) {
  return randomDeck(seed).map((e) => ({ cardId: e.cardId, count: e.count }));
}

export { QUEST_TEMPLATES };

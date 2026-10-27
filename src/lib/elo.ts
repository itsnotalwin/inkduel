import { ELO_K } from "@/config";

export type MatchResult = "WIN" | "LOSS" | "DRAW";

/** Standard Elo: new = old + K·(S − E). */
export function eloDelta(playerMmr: number, opponentMmr: number, result: MatchResult): {
  expected: number;
  score: number;
  delta: number;
  newMmr: number;
} {
  const expected = 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
  const score = result === "WIN" ? 1 : result === "DRAW" ? 0.5 : 0;
  const delta = Math.round(ELO_K * (score - expected));
  return { expected, score, delta, newMmr: playerMmr + delta };
}

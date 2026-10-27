/** Shape of the match summary the client posts and achievements evaluate. */
export interface MatchResultSummary {
  opponentKey: string;
  result: "WIN" | "LOSS" | "DRAW";
  turns: number;
  playerHpLeft: number;
  botHpLeft: number;
  seed: number;
  deckUsed: { cardId: string; count: number }[];
  actionLog?: { turn: number; side: string; text: string }[];
  durationMs?: number;
  maxTurnDamage?: number;
  maxTurnKills?: number;
  tookFatigue?: boolean;
}

/** The materialized form used by achievement evaluation. */
export type MatchCore = Required<Omit<MatchResultSummary, "actionLog">>;

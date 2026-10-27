/** Daily quest templates. One quest per player per day, deterministic per date. */

export interface QuestTemplate {
  key: string;
  /** Short description with the target interpolated. */
  description: (target: number) => string;
  target: number;
  metric: "matches" | "wins" | "damage";
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { key: "play_matches", description: (t) => `Play ${t} matches today`, target: 3, metric: "matches" },
  { key: "win_matches", description: (t) => `Win ${t} matches today`, target: 2, metric: "wins" },
  { key: "deal_damage", description: (t) => `Deal ${t} damage to enemy heroes today`, target: 30, metric: "damage" },
];

export function questForDate(dateKey: string, playerId: string): QuestTemplate {
  // deterministic pick per player+day
  let h = 0;
  const s = `${dateKey}:${playerId}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return QUEST_TEMPLATES[Math.abs(h) % QUEST_TEMPLATES.length];
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

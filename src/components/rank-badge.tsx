/** Hand-drawn rank badge stamps — Wood (pencil sketch) up to INK MASTER (wax seal). */
import type { RankKey } from "@/config";

const STYLE: Record<RankKey, { stroke: string; fill: string; seal: boolean }> = {
  wood: { stroke: "var(--color-pencil)", fill: "none", seal: false },
  bronze: { stroke: "var(--color-graphite)", fill: "var(--color-paper-deep)", seal: false },
  silver: { stroke: "var(--color-graphite)", fill: "var(--color-paper)", seal: false },
  gold: { stroke: "var(--color-ink)", fill: "var(--color-paper-deep)", seal: false },
  platinum: { stroke: "var(--color-ink)", fill: "var(--color-cardstock)", seal: false },
  obsidian: { stroke: "var(--color-ink)", fill: "var(--color-ink)", seal: false },
  "ink-master": { stroke: "var(--color-ink)", fill: "var(--color-ink)", seal: true },
};

const ABBR: Record<RankKey, string> = {
  wood: "I",
  bronze: "II",
  silver: "III",
  gold: "IV",
  platinum: "V",
  obsidian: "VI",
  "ink-master": "IN",
};

export function RankBadge({ rank, size = 40 }: { rank: RankKey; size?: number }) {
  const s = STYLE[rank] ?? STYLE.wood;
  return (
    <svg viewBox="0 0 44 44" style={{ width: size, height: size }} aria-label={`Rank ${rank}`}>
      {s.seal ? (
        <>
          <path
            d="M22 3c7-2 16 3 17 11 .8 6-1.6 9 1 14 2.4 4.6-1 10-7 12-5 1.6-12 2-17-1-5-3-9-8-8-15C9 17 10 10 16 6c2-1.4 4-2.4 6-3Z"
            fill={s.stroke}
          />
          <text
            x="22"
            y="29"
            textAnchor="middle"
            style={{ fontFamily: "var(--font-display)", fontSize: 13, fill: "var(--color-paper)", fontWeight: 700 }}
          >
            {ABBR[rank]}
          </text>
        </>
      ) : (
        <>
          <circle cx="22" cy="22" r="19" fill={s.fill} stroke={s.stroke} strokeWidth="2.5" strokeDasharray={rank === "wood" ? "4 3" : undefined} />
          <circle cx="22" cy="22" r="13.5" fill="none" stroke={s.stroke} strokeWidth="1.6" strokeDasharray={rank === "wood" ? "3 2.4" : undefined} />
          <text
            x="22"
            y="27"
            textAnchor="middle"
            style={{
              fontFamily: "var(--font-type)",
              fontSize: 11,
              fill: rank === "obsidian" ? "var(--color-paper)" : s.stroke,
              fontWeight: 600,
            }}
          >
            {ABBR[rank]}
          </text>
        </>
      )}
    </svg>
  );
}

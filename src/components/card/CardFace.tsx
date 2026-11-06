import { memo, type MouseEvent } from "react";
import type { CardDef, Wash } from "@/game/cards";
import { KEYWORD_LABEL } from "@/game/cards";
import { ArtCanvas, CardArt, GroundLine, Ink, Sketch } from "@/lib/cards/art";
import { WashiTape } from "@/components/paper";

export type CardSize = "hand" | "board" | "collection" | "token";

/** Area washes → the palette vars defined in globals.css. */
export const WASH_VAR: Record<Wash, string> = {
  sepia: "var(--wash-sepia)",
  slate: "var(--wash-slate)",
  rose: "var(--wash-rose)",
  graphite: "var(--wash-graphite)",
  crimson: "var(--wash-crimson)",
};

/** A wash pulled back toward ink — tinted frames that still read as inked. */
export function washInk(wash: Wash): string {
  return `color-mix(in srgb, ${WASH_VAR[wash]} 55%, var(--color-ink))`;
}

function RarityMark({ rarity, initial }: { rarity: CardDef["rarity"]; initial: string }) {
  switch (rarity) {
    case "common":
      return <span aria-label="Common" className="block" style={{ width: "4cqw", height: "4cqw", borderRadius: "9999px", background: "var(--color-pencil)" }} />;
    case "rare":
      return (
        <svg aria-label="Rare" viewBox="0 0 20 20" style={{ width: "9cqw", height: "9cqw" }}>
          <circle cx="10" cy="10" r="6.5" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
          <circle cx="10" cy="10" r="3" fill="none" stroke="var(--color-ink)" strokeWidth="1.5" />
        </svg>
      );
    case "epic":
      return (
        <svg aria-label="Epic" viewBox="0 0 20 20" style={{ width: "9cqw", height: "9cqw" }}>
          <circle cx="10" cy="10" r="6" fill="var(--color-ink)" />
          <circle cx="10" cy="10" r="8.5" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" />
        </svg>
      );
    case "legendary":
      return (
        <svg aria-label="Legendary" viewBox="0 0 22 22" style={{ width: "12cqw", height: "12cqw" }}>
          <path
            d="M11 2c4.5-1.4 9 2.2 8.4 7-.4 3.4.8 5.4-1.6 8-2 2.2-4 3.4-6.8 3-2.8.4-4.8-.8-6.8-3C1.8 14.4 3 12.4 2.6 9 2 4.2 6.5.6 11 2Z"
            fill="var(--color-ink)"
          />
          <text
            x="11"
            y="15"
            textAnchor="middle"
            style={{ fontFamily: "var(--font-display)", fontSize: 9, fill: "var(--color-cardstock)", fontWeight: 700 }}
          >
            {initial}
          </text>
        </svg>
      );
  }
}

function NibIcon() {
  return (
    <svg viewBox="0 0 20 20" style={{ width: "4.5cqw", height: "4.5cqw" }} aria-hidden>
      <path d="M10 2 15 12c-1.5 2-3 3-5 6-2-3-3.5-4-5-6L10 2Z" fill="var(--color-cardstock)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="10" cy="11" r="1.4" fill="var(--color-ink)" />
    </svg>
  );
}

function DropletIcon() {
  return (
    <svg viewBox="0 0 20 20" style={{ width: "4.5cqw", height: "4.5cqw" }} aria-hidden>
      <path d="M10 2C13 6.5 16 9.5 16 13a6 6 0 1 1-12 0c0-3.5 3-6.5 6-11Z" fill="var(--color-cardstock)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldDoodle() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: "9cqw", height: "9cqw" }} aria-label="Guard">
      <path d="M12 2 20 5v7c0 5-3.5 8-8 10-4.5-2-8-5-8-10V5l8-3Z" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M8.5 11.5 11 14l5-5.5" fill="none" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MotionLines() {
  return (
    <svg viewBox="0 0 26 20" style={{ width: "11cqw", height: "8cqw" }} aria-label="Swift">
      <g stroke="var(--color-graphite)" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M2 4h14" />
        <path d="M6 10h16" />
        <path d="M2 16h12" />
      </g>
    </svg>
  );
}

/** Render rules text with keyword names bolded. */
function RulesText({ text, fontSize = "7.4cqw" }: { text: string; fontSize?: string }) {
  if (!text) return null;
  const keywords = Object.values(KEYWORD_LABEL);
  const pattern = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
  const parts = text.split(pattern);
  return (
    <p style={{ fontSize, lineHeight: 1.3 }}>
      {parts.map((part, i) =>
        keywords.includes(part) ? (
          <b key={i}>{part}</b>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

/**
 * Area cards have no per-card illustration in the registry — they share one
 * "the table set out" doodle, washed in the card's own hue. The wash pool is
 * the only tinted fill on any face.
 */
function AreaArt({ wash, accent }: { wash: Wash; accent: string }) {
  return (
    <ArtCanvas bg={`color-mix(in srgb, ${WASH_VAR[wash]} 26%, var(--color-paper))`} label="Area illustration">
      {/* the wash pool the table sits in */}
      <ellipse cx="50" cy="40" rx="40" ry="15" fill={WASH_VAR[wash]} opacity="0.55" />
      {/* drafting table, seen slightly from above */}
      <Ink width={2.6}>
        <path d="M18 30 L50 20 L82 30 L50 41 Z" fill="var(--color-cardstock)" />
        <path d="M24 33 L24 48 M76 33 L76 48" />
        <path d="M18 30 L18 44 M82 30 L82 44" opacity="0.55" />
      </Ink>
      {/* the sheet pinned to the table */}
      <Ink width={2}>
        <path d="M38 27 L54 22 L64 26 L48 32 Z" fill="var(--color-paper)" />
      </Ink>
      <Sketch>
        <path d="M42 27 L52 24 M44 29 L58 25" />
        <path d="M30 52 C40 50 62 54 74 51" />
      </Sketch>
      <GroundLine y={54} />
      <path d="M14 56 C30 58 70 54 88 57" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    </ArtCanvas>
  );
}

/** Mobile-first widths: small by default, scaling up with the viewport. */
const SIZE_WIDTH: Record<CardSize, string> = {
  hand: "clamp(96px, 24vw, 150px)",
  board: "clamp(120px, 40vw, 190px)",
  collection: "clamp(124px, 40vw, 168px)",
  token: "clamp(96px, 22vw, 120px)",
};

export interface CardFaceProps {
  card: CardDef;
  size?: CardSize;
  locked?: boolean;
  /** Legal-target highlight (hand-drawn ring). */
  highlight?: boolean;
  /** Illegal target dimming. */
  dimmed?: boolean;
  /** Tiny resting rotation in degrees (hand-placed feel). */
  rotation?: number;
  /** Show a count badge (deck builder / deck strip). */
  count?: number;
  className?: string;
}

function CardFaceInner({
  card,
  size = "collection",
  locked = false,
  highlight = false,
  dimmed = false,
  rotation = 0,
  count,
  className = "",
}: CardFaceProps) {
  const isSpell = card.type === "spell";
  const isUnit = card.type === "unit";
  const isArea = card.type === "area";
  const wash: Wash = card.wash ?? "graphite";
  const accent = locked ? "var(--color-pencil)" : washInk(wash);
  return (
    <div
      className={`card-root shrink-0 ${className}`}
      style={{ ["--card-w" as string]: SIZE_WIDTH[size], opacity: dimmed ? 0.4 : 1 }}
      data-card-id={card.id}
    >
      <div
        className={`card-face focus-ink ${locked ? "card-face-locked" : ""} ${highlight ? "target-ring" : ""}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          // areas: the one tinted family — frame pulled toward the wash;
          // locked areas keep the dashed pencil frame but keep a faint tint
          ...(isArea
            ? locked
              ? { background: `color-mix(in srgb, ${WASH_VAR[wash]} 20%, var(--color-paper))` }
              : {
                  background: `color-mix(in srgb, ${WASH_VAR[wash]} 38%, var(--color-cardstock))`,
                  borderColor: accent,
                }
            : {}),
        }}
        tabIndex={0}
      >
        {/* cost */}
        <div
          aria-label={`Cost ${card.cost}`}
          className="absolute z-10 flex items-center justify-center rounded-full"
          style={{
            width: "21cqw",
            height: "21cqw",
            left: "3cqw",
            top: "3cqw",
            background: "var(--color-ink)",
            color: "var(--color-paper)",
            fontFamily: "var(--font-type)",
            fontSize: "11cqw",
          }}
        >
          {card.cost}
        </div>

        {/* rarity mark */}
        <div className="absolute z-10" style={{ right: "4cqw", top: "4cqw" }}>
          <RarityMark rarity={card.rarity} initial={card.name[0]} />
        </div>

        {/* art window */}
        <div
          className="relative overflow-hidden"
          style={{
            margin: "3.5cqw 3.5cqw 0",
            height: isSpell ? "46%" : "40%",
            border: `1.5px solid ${isArea && !locked ? accent : "var(--color-ink)"}`,
            borderRadius: "6px 4px 7px 5px / 5px 7px 4px 6px",
            background: isArea && !locked ? `color-mix(in srgb, ${WASH_VAR[wash]} 26%, var(--color-paper))` : "var(--color-paper)",
          }}
        >
          {isArea ? <AreaArt wash={wash} accent={accent} /> : <CardArt id={card.id} />}
          {/* areas: the wash-name chip, riding the bottom of the art window */}
          {isArea && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center" style={{ paddingBottom: "1.4cqw" }}>
              <span
                className="label-type"
                style={{
                  fontSize: "4.4cqw",
                  lineHeight: 1.5,
                  padding: "0.4cqw 2.2cqw",
                  border: `1.5px solid ${accent}`,
                  borderRadius: "4px 6px 5px 7px / 6px 4px 7px 5px",
                  background: "var(--color-paper)",
                  color: accent,
                  whiteSpace: "nowrap",
                }}
              >
                Area · {card.name}
              </span>
            </div>
          )}
          {isUnit && card.keywords?.includes("swift") && (
            <div className="absolute" style={{ left: "1cqw", bottom: "1cqw" }}>
              <MotionLines />
            </div>
          )}
          {isUnit && card.keywords?.includes("guard") && (
            <div className="absolute" style={{ right: "1cqw", bottom: "1cqw" }}>
              <ShieldDoodle />
            </div>
          )}
          {locked && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(244,241,234,0.72)" }}>
              <svg viewBox="0 0 60 60" style={{ width: "40%" }} aria-hidden>
                <rect x="14" y="26" width="32" height="24" rx="4" fill="none" stroke="var(--color-pencil)" strokeWidth="3" strokeDasharray="4 3" />
                <path d="M22 26v-6a8 8 0 0 1 16 0v6" fill="none" stroke="var(--color-pencil)" strokeWidth="3" strokeDasharray="4 3" />
              </svg>
            </div>
          )}
        </div>

        {/* name plate */}
        <div
          className="text-center small-caps"
          style={{
            margin: "2cqw 3.5cqw 0",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "8.2cqw",
            lineHeight: 1.15,
            borderTop: "1px solid var(--color-ink)",
            borderBottom: "1px solid var(--color-ink)",
            padding: "1.6cqw 0",
          }}
        >
          {card.name}
        </div>

        {/* text box */}
        <div
          className="flex-1 px-1"
          style={{
            margin: "1.8cqw 3.5cqw 0",
            fontFamily: "var(--font-type)",
            color: locked ? "var(--color-pencil)" : "var(--color-ink)",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          {/* areas carry the rules of the table — their text reads loudest */}
          <RulesText text={card.text} fontSize={isArea && !locked ? "8.4cqw" : undefined} />
        </div>

        {/* stat chips */}
        {isUnit && (
          <div
            className="flex items-end justify-between"
            style={{ margin: "0 2.5cqw 2.5cqw" }}
          >
            <span
              className="flex items-center"
              aria-label={`Attack ${card.attack}`}
              style={{
                gap: "1.2cqw",
                border: "2px solid var(--color-ink)",
                borderRadius: "40% 60% 55% 45% / 50% 45% 55% 50%",
                background: "var(--color-cardstock)",
                padding: "0.6cqw 2.2cqw 0.6cqw 1.4cqw",
                fontFamily: "var(--font-type)",
                fontSize: "9.5cqw",
                lineHeight: 1.2,
              }}
            >
              <NibIcon />
              {card.attack}
            </span>
            <span
              className="flex items-center"
              aria-label={`Health ${card.health}`}
              style={{
                gap: "1.2cqw",
                border: "2px solid var(--color-ink)",
                borderRadius: "60% 40% 45% 55% / 45% 55% 50% 50%",
                background: "var(--color-cardstock)",
                padding: "0.6cqw 1.4cqw 0.6cqw 2.2cqw",
                fontFamily: "var(--font-type)",
                fontSize: "9.5cqw",
                lineHeight: 1.2,
              }}
            >
              {card.health}
              <DropletIcon />
            </span>
          </div>
        )}
        {isSpell && (
          <div className="self-center" style={{ marginBottom: "2.5cqw" }}>
            <svg viewBox="0 0 40 10" style={{ width: "30cqw" }} aria-hidden>
              <path d="M2 6c6-4 10 4 16 0s10 4 20-2" fill="none" stroke="var(--color-pencil)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        )}
        {/* areas close with a wash-tinted stroke instead of stat chips */}
        {isArea && (
          <div className="self-center" style={{ marginBottom: "2.5cqw" }}>
            <svg viewBox="0 0 40 10" style={{ width: "30cqw" }} aria-hidden>
              <path d="M2 6c6-4 10 4 16 0s10 4 20-2" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* count badge */}
        {count !== undefined && (
          <div
            className="absolute z-10 flex items-center justify-center rounded-full"
            style={{
              right: "2cqw",
              bottom: "2cqw",
              width: "13cqw",
              height: "13cqw",
              background: "var(--color-ink)",
              color: "var(--color-paper)",
              fontFamily: "var(--font-type)",
              fontSize: "7.5cqw",
            }}
          >
            {count}
          </div>
        )}
      </div>
      {locked && (
        <WashiTape angle={-6} width="60%" className="left-1/2 -translate-x-1/2 -top-2" />
      )}
    </div>
  );
}

/**
 * Memoized — CardFace is the most-rendered component in the game (120 on the
 * collection grid, 10+ in the builder, 10+ on the duel board). The custom
 * comparator skips re-renders when only the parent re-rendered but the card's
 * visual props didn't change (the card object is immutable, so id + size +
 * visual flags are sufficient).
 */
export const CardFace = memo(CardFaceInner, (prev, next) => {
  return (
    prev.card.id === next.card.id &&
    prev.size === next.size &&
    prev.locked === next.locked &&
    prev.highlight === next.highlight &&
    prev.dimmed === next.dimmed &&
    prev.rotation === next.rotation &&
    prev.count === next.count &&
    prev.className === next.className
  );
});

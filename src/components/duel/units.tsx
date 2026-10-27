"use client";

import { motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import type { UnitInstance } from "@/game/engine";
import { getCard } from "@/game/cards";

/** Compact board unit — art + name + stat chips, standing in its slot. */
export function BoardUnit({
  unit,
  side,
  highlight = false,
  dimmed = false,
  lunging = false,
  floaters,
  onClick,
}: {
  unit: UnitInstance;
  side: "A" | "B";
  highlight?: boolean;
  dimmed?: boolean;
  lunging?: boolean;
  floaters?: React.ReactNode;
  onClick?: () => void;
}) {
  const def = getCard(unit.cardId);
  const reduce = useReducedMotion();
  const lungeY = side === "B" ? 18 : -18;
  const springIn: TargetAndTransition = { opacity: 1, scale: 1, y: 0, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 22 } };
  const lunge: TargetAndTransition = {
    opacity: 1,
    scale: [1, 1.12, 1],
    y: [0, lungeY, 0],
    rotate: [0, side === "A" ? -3 : 3, 0],
    transition: { duration: 0.32, times: [0, 0.45, 1], ease: "easeInOut" },
  };
  const animateProps: TargetAndTransition = reduce ? { opacity: 1 } : lunging ? lunge : springIn;
  return (
    <motion.button
      layout
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={`${def.name} ${unit.attack}/${unit.health}${unit.keywords.length ? ` (${unit.keywords.join(", ")})` : ""}${side === "A" ? ", yours" : ", enemy"}`}
      className="relative focus-ink"
      style={{ width: "var(--unit-w, 108px)", cursor: onClick ? "pointer" : "default", opacity: dimmed ? 0.4 : 1 }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: side === "A" ? 40 : -40 }}
      animate={animateProps}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scaleY: 0.1, rotate: side === "A" ? 8 : -8, transition: { duration: 0.26 } }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          border: `2px solid var(--color-ink)`,
          borderRadius: "8px 6px 9px 7px / 7px 9px 6px 8px",
          background: "var(--color-cardstock)",
          boxShadow: "1px 2px 4px rgba(23,20,15,0.25)",
          aspectRatio: "5 / 6.4",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* art */}
        <div
          className="relative overflow-hidden"
          style={{ margin: "4%", height: "52%", border: "1px solid var(--color-ink)", background: "var(--color-paper)", borderRadius: "4px" }}
        >
          <CardArtInline id={unit.cardId} />
        </div>
        {/* name */}
        <div
          className="small-caps text-center"
          style={{ fontSize: "clamp(8px, 1.3vh, 11px)", lineHeight: 1.1, padding: "2px 2px 0", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
        >
          {def.name}
        </div>
        {/* keyword pips */}
        <div className="flex justify-center gap-1" style={{ fontSize: "clamp(6px,1vh,8px)", fontFamily: "var(--font-type)", color: "var(--color-graphite)" }}>
          {unit.keywords.includes("guard") && <span title="Guard">shield</span>}
          {unit.keywords.includes("swift") && <span title="Swift">»</span>}
          {unit.keywords.includes("twinstrike") && <span title="Twinstrike">×2</span>}
        </div>
        {/* stat chips */}
        <div className="mt-auto flex items-end justify-between" style={{ padding: "0 4% 4%" }}>
          <span
            className="flex items-center"
            style={{
              gap: 2, border: "1.5px solid var(--color-ink)", borderRadius: "40% 60% 55% 45% / 50% 45% 55% 50%",
              background: "var(--color-cardstock)", padding: "0 4px", fontFamily: "var(--font-type)", fontSize: "clamp(9px,1.5vh,12px)",
            }}
          >
            {unit.attack}
          </span>
          <span
            className="flex items-center"
            style={{
              gap: 2, border: "1.5px solid var(--color-ink)", borderRadius: "60% 40% 45% 55% / 45% 55% 50% 50%",
              background: unit.health < unit.maxHealth ? "var(--color-paper-deep)" : "var(--color-cardstock)",
              padding: "0 4px", fontFamily: "var(--font-type)", fontSize: "clamp(9px,1.5vh,12px)",
              color: unit.health < unit.maxHealth ? "var(--color-red-stamp)" : "var(--color-ink)",
            }}
          >
            {unit.health}
          </span>
        </div>
        {highlight && <div className="target-ring pointer-events-none absolute inset-0" style={{ borderRadius: "8px 6px 9px 7px / 7px 9px 6px 8px" }} />}
      </div>
      {/* attacks left pips */}
      {unit.attacksLeft > 0 && !unit.sick && (
        <div aria-hidden className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full border-2 border-ink bg-cardstock" />
      )}
      {floaters}
    </motion.button>
  );
}

/** Lazy art inline (no client registry import cycle — direct import). */
import { CardArt } from "@/lib/cards/art";
function CardArtInline({ id }: { id: string }) {
  return <CardArt id={id} />;
}

/** Card back for the opponent's hand / deck piles. */
export function CardBack({ w = 64 }: { w?: number }) {
  return (
    <div
      aria-hidden
      className="relative shrink-0"
      style={{
        width: w,
        aspectRatio: "5 / 7",
        border: "2px solid var(--color-ink)",
        borderRadius: "7px 5px 8px 6px / 6px 8px 5px 7px",
        background: "var(--color-paper-deep)",
        boxShadow: "1px 2px 3px rgba(23,20,15,0.2)",
      }}
    >
      <svg viewBox="0 0 50 70" className="absolute inset-0 h-full w-full">
        <rect x="6" y="6" width="38" height="58" fill="none" stroke="var(--color-graphite)" strokeWidth="1.4" strokeDasharray="3 2.4" rx="3" />
        <path d="M25 18 C33 26 33 36 25 44 C17 36 17 26 25 18 Z" fill="none" stroke="var(--color-graphite)" strokeWidth="1.6" />
        <circle cx="25" cy="31" r="3.4" fill="none" stroke="var(--color-graphite)" strokeWidth="1.4" />
      </svg>
    </div>
  );
}

/** Hero plate: oval doodle portrait, HP in Caveat, name. */
export function HeroPlate({
  name,
  hp,
  side,
  active,
  highlight = false,
  dimmed = false,
  floaters,
  onClick,
  sub,
}: {
  name: string;
  hp: number;
  side: "A" | "B";
  active?: boolean;
  highlight?: boolean;
  dimmed?: boolean;
  floaters?: React.ReactNode;
  onClick?: () => void;
  sub?: string;
}) {
  return (
    <motion.div layout className="relative flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={`${name}, ${hp} HP${side === "A" ? ", your hero" : ", enemy hero"}`}
        className={`focus-ink relative ${onClick ? "cursor-pointer" : "cursor-default"}`}
        style={{ opacity: dimmed ? 0.4 : 1 }}
      >
        <svg viewBox="0 0 84 84" style={{ width: side === "A" ? "clamp(48px, 14vw, 72px)" : "clamp(40px, 11vw, 60px)" }} className={side === "B" ? "rotate-180" : ""}>
          <ellipse cx="42" cy="42" rx="38" ry="40" fill="var(--color-cardstock)" stroke="var(--color-ink)" strokeWidth="2.5" />
          {/* doodle self-portrait */}
          <path d="M42 20 C52 20 58 28 58 38 C58 50 50 58 42 58 C34 58 26 50 26 38 C26 28 32 20 42 20 Z" fill="none" stroke="var(--color-ink)" strokeWidth="2.2" />
          <path d="M34 36 C36 33 40 33 42 35 M44 35 C46 33 50 33 52 36" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
          <path d="M36 46 C40 50 44 50 48 46" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
          <path d="M30 24 C36 14 50 14 56 24" fill="none" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        {highlight && <div className="target-ring pointer-events-none absolute inset-0 rounded-full" />}
        {active && (
          <span aria-hidden className="absolute -right-1 top-1 block h-3 w-3 rounded-full" style={{ background: "var(--color-red-stamp)" }} />
        )}
      </button>
      <div className="leading-tight">
        <div className="label-type text-[10px] text-graphite">{side === "A" ? "YOU" : "OPPONENT"}</div>
        <div className="small-caps text-lg font-semibold">{name}</div>
        {sub && <div className="label-type text-[9px] text-graphite">{sub}</div>}
        <div
          className="font-hand"
          style={{
            fontSize: hp < 10 ? 44 : 36,
            lineHeight: 1,
            color: "var(--color-ink)",
          }}
        >
          {Math.max(0, hp)}
          <span className="ml-1 text-base text-graphite">HP</span>
        </div>
      </div>
      {floaters}
    </motion.div>
  );
}

/** Mana droplets: filled = available, outlined = spent. */
export function ManaCrystals({ available, cap, temp }: { available: number; cap: number; temp: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Mana ${available}/${cap}`}>
      {Array.from({ length: cap }).map((_, i) => (
        <svg key={i} viewBox="0 0 14 18" style={{ width: 13 }}>
          <path
            d="M7 1.5 C10 6 12.5 8.5 12.5 11.5 A5.5 5.5 0 1 1 1.5 11.5 C1.5 8.5 4 6 7 1.5 Z"
            fill={i < available ? "var(--color-ink)" : "none"}
            stroke={i < available ? "var(--color-ink)" : "var(--color-pencil)"}
            strokeWidth="1.6"
          />
        </svg>
      ))}
      {temp > 0 && (
        <span className="label-type ml-1 text-[10px]" style={{ color: "var(--color-graphite)" }}>
          +{temp}
        </span>
      )}
    </div>
  );
}

/** Deck pile with sketchy stack + typewriter count. */
export function DeckPile({ count, label }: { count: number; label: string }) {
  return (
    <div className="relative" aria-label={`${label}: ${count} cards`}>
      <div className="relative" style={{ width: 58, height: 81 }}>
        <div className="absolute inset-0" style={{ transform: "translate(4px,4px) rotate(1.5deg)" }}><CardBack w={58} /></div>
        <div className="absolute inset-0" style={{ transform: "translate(2px,2px) rotate(-1deg)" }}><CardBack w={58} /></div>
        <div className="absolute inset-0"><CardBack w={58} /></div>
      </div>
      <span
        className="label-type absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs"
        style={{ fontFamily: "var(--font-type)" }}
      >
        ×{count}
      </span>
    </div>
  );
}

/** Floating red-stamp damage / heal numbers. */
export function Floater({ n, kind, id }: { n: number; kind: "damage" | "heal" | "fatigue"; id: number }) {
  const reduce = useReducedMotion();
  const color = kind === "heal" ? "var(--color-ink)" : "var(--color-red-stamp)";
  return (
    <motion.span
      key={id}
      className="font-hand pointer-events-none absolute z-30 left-1/2 -translate-x-1/2 whitespace-nowrap"
      style={{
        top: -10,
        color,
        fontSize: n >= 10 ? 46 : 38,
        fontWeight: 700,
        textShadow: "0 0 2px var(--color-paper), 0 2px 2px rgba(244,241,234,0.9)",
      }}
      initial={reduce ? { opacity: 0 } : { opacity: 1, y: 8, scale: 1.4, rotate: -8 }}
      animate={reduce ? { opacity: 0 } : { opacity: 0, y: -54, rotate: 5, scale: 1 }}
      transition={{ duration: 0.95, ease: "easeOut" }}
    >
      {kind === "heal" ? `+${n}` : `-${n}`}
    </motion.span>
  );
}

/** Ink slash flash, rendered over the target that got hit. */
export function InkSlash({ id }: { id: number }) {
  return (
    <motion.svg
      key={id}
      viewBox="0 0 120 40"
      className="pointer-events-none absolute left-1/2 top-1/2 z-40 w-[130%] -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0.95, rotate: -14 }}
      animate={{ opacity: 0, rotate: -6 }}
      transition={{ duration: 0.24 }}
    >
      <path d="M6 32 C26 14 44 30 62 16 C80 4 100 22 114 10" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
      <path d="M14 36 C34 24 52 34 74 24" fill="none" stroke="var(--color-graphite)" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
    </motion.svg>
  );
}

/** Rubber-stamp turn banner. */
export function TurnBanner({ text, tone = "ink" }: { text: string; tone?: "ink" | "red" }) {
  const reduce = useReducedMotion();
  const color = tone === "red" ? "var(--color-red-stamp)" : "var(--color-ink)";
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
      initial={false}
      onAnimationComplete={() => undefined}
    >
      <motion.span
        className="label-type select-none"
        style={{
          fontSize: "clamp(40px, 8vw, 84px)",
          color,
          border: `4px solid ${color}`,
          borderRadius: "10px 16px 12px 18px / 18px 12px 16px 10px",
          padding: "6px 28px",
          background: "rgba(244,241,234,0.55)",
          rotate: -8,
        }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.6 }}
        animate={reduce ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], scale: [2.6, 1, 1, 1] }}
        transition={{ duration: 1.1, times: [0, 0.25, 0.75, 1] }}
      >
        {text}
      </motion.span>
    </motion.div>
  );
}

/** Graphite dust burst when a card lands. */
export function DustBurst({ id }: { id: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span key={id} className="pointer-events-none absolute inset-0 z-30">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--color-graphite)" }}
          initial={{ x: 0, y: 0, opacity: 0.9 }}
          animate={{ x: (i % 2 === 0 ? -1 : 1) * (10 + i * 6), y: -8 - i * 4, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

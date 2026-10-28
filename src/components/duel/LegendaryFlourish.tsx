"use client";

import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import { getCard } from "@/game/cards";
import { CardFace } from "@/components/card/CardFace";

/**
 * In-duel legendary summon cutscene — a full-screen flourish when a
 * legendary hits the board: darkened page, oversized art, name plate.
 */

export interface FlourishState {
  id: number;
  cardId: string;
  side: "A" | "B";
}

export function LegendaryFlourish({ flourish }: { flourish: FlourishState | null }) {
  const reduce = useReducedMotion();
  if (!flourish) return null;
  const def = getCard(flourish.cardId);
  const yours = flourish.side === "A";
  return (
    <motion.div
      key={flourish.id}
      className="pointer-events-none fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.9, times: [0, 0.15, 0.8, 1] }}
      style={{ background: "rgba(23,20,15,0.55)" }}
    >
      {!reduce && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.4 }}
          style={{ background: "radial-gradient(circle at center, rgba(244,241,234,0.25), transparent 60%)" }}
        />
      )}
      <motion.div
        initial={reduce ? { opacity: 0 } : { scale: 2.4, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: -3 }}
        transition={{ type: "spring", stiffness: 260, damping: 17 }}
        className="ink-frame relative p-2"
        style={{ boxShadow: "0 18px 60px rgba(23,20,15,0.5)" }}
      >
        <div className="h-[38vh] w-[27vh] min-h-[220px] min-w-[158px]">
          <CardFace card={def} size="collection" />
        </div>
      </motion.div>
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={reduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <span className="label-type text-[10px]" style={{ color: "var(--color-paper)" }}>
          {yours ? "YOU SUMMON" : "THEY SUMMON"}
        </span>
        <span className="small-caps text-4xl font-bold" style={{ color: "var(--color-paper)", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
          {def.name}
        </span>
        <span className="label-type text-[10px] tracking-[0.3em]" style={{ color: "var(--color-paper)", opacity: 0.75 }}>
          LEGENDARY
        </span>
      </motion.div>
    </motion.div>
  );
}

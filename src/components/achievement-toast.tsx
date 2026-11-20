"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Stamp } from "@/components/paper";
import { getCard } from "@/game/cards";
import { sound } from "@/lib/sound";

export interface AchievementNotice {
  key: string;
  name: string;
  description: string;
  unlocksCard?: string | null;
}

/**
 * Celebrates achievement unlocks on any page: red stamps slide in with a
 * confirm sting and dismiss themselves. Mount it once per page and feed it
 * the `newAchievements` array from whatever flow just resolved.
 */
export function AchievementToasts({ items }: { items: AchievementNotice[] }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<AchievementNotice[]>([]);

  useEffect(() => {
    if (items.length === 0) return;
    sound.confirm();
    // the reveal is deferred a frame — synchronous setState in an effect
    // cascades renders, and the entrance animation survives the hop
    const show = window.setTimeout(() => setShown(items), 0);
    const hide = window.setTimeout(() => setShown([]), 6800);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [items]);

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[85] flex flex-col items-start gap-3">
      <AnimatePresence>
        {shown.map((a) => (
          <motion.div
            key={a.key}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -90, rotate: -6 }}
            animate={{ opacity: 1, x: 0, rotate: -2 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -70, rotate: 3 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="ink-frame max-w-xs bg-cardstock px-4 py-3"
            style={{ boxShadow: "4px 5px 0 0 var(--color-ink)" }}
          >
            <div className="label-type text-[9px] text-graphite">ACHIEVEMENT · STAMPED</div>
            <Stamp tone="red" className="mt-1 text-sm">
              {a.name}
            </Stamp>
            <div className="mt-1.5 text-xs leading-snug text-graphite">{a.description}</div>
            {a.unlocksCard && (
              <div className="label-type mt-1.5 text-[9px]" style={{ color: "var(--color-red-stamp)" }}>
                ★ UNLOCKS: {cardName(a.unlocksCard)}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function cardName(id: string): string {
  try {
    return getCard(id).name;
  } catch {
    return id;
  }
}

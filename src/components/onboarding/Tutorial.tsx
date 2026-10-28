"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HandNote, StampButton } from "@/components/paper";

/**
 * Contextual onboarding tips for the duel. Each tip shows once (persisted in
 * localStorage); "Skip all" clears the rest. Triggered by game events passed
 * in from the duel client.
 */

export interface TutorialFlags {
  tipWelcome: boolean;
  tipMana: boolean;
  tipPlay: boolean;
  tipAttack: boolean;
  tipWin: boolean;
  tipTempo: boolean;
}

const KEY = "inkduel:tutorial";

export function readTutorialFlags(): TutorialFlags {
  if (typeof window === "undefined") {
    return { tipWelcome: true, tipMana: true, tipPlay: true, tipAttack: true, tipWin: true, tipTempo: true };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as TutorialFlags;
  } catch {
    // fall through to defaults
  }
  return { tipWelcome: true, tipMana: true, tipPlay: true, tipAttack: true, tipWin: true, tipTempo: true };
}

export function dismissTutorialTip(tip: keyof TutorialFlags) {
  const flags = readTutorialFlags();
  flags[tip] = false;
  window.localStorage.setItem(KEY, JSON.stringify(flags));
}

export function resetTutorialFlags() {
  window.localStorage.setItem(
    KEY,
    JSON.stringify({ tipWelcome: true, tipMana: true, tipPlay: true, tipAttack: true, tipWin: true, tipTempo: true }),
  );
  window.localStorage.removeItem("inkduel:seenPrologue");
}

export function tutorialComplete(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    const flags = JSON.parse(raw) as TutorialFlags;
    return !Object.values(flags).some(Boolean);
  } catch {
    return true;
  }
}

interface TipDefinition {
  title: string;
  body: string;
}

const TIPS: Record<keyof TutorialFlags, TipDefinition> = {
  tipWelcome: {
    title: "Welcome to the duel",
    body: "Reduce the enemy hero from 30 HP to 0 before they do the same to you. First: the mulligan — tap cards you don't want, you redraw the same count.",
  },
  tipMana: {
    title: "Mana is your ink",
    body: "The droplets above the End Turn button are mana. Playing cards spends it — it refills fully, and grows by one, every turn.",
  },
  tipPlay: {
    title: "Playing cards",
    body: "Tap a card in your hand. If it needs a target, legal targets get an ink ring — tap one. Tap the card again or press ESC to cancel.",
  },
  tipAttack: {
    title: "Attacking",
    body: "Tap your unit, then tap an enemy. Units sleep the turn they arrive unless they have Swift. Guards must be cleared before the hero can be touched.",
  },
  tipWin: {
    title: "Winning",
    body: "Swing at the enemy hero to drop them to 0. Watch your own HP — and the 75-second turn timer, which ends your turn for you.",
  },
  tipTempo: {
    title: "The Tempo Token",
    body: "Whoever plays second holds the Tempo Token — a free card that grants 1 mana for one turn. Spend it early.",
  },
};

export function TutorialTip({
  tip,
  onDismiss,
}: {
  tip: keyof TutorialFlags | null;
  onDismiss: (tip: keyof TutorialFlags) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          key={tip}
          className="ink-frame fixed left-1/2 top-14 z-[65] w-[min(420px,92vw)] -translate-x-1/2 p-4"
          style={{ background: "var(--color-cardstock)", boxShadow: "0 10px 30px rgba(23,20,15,0.25)" }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="label-type text-[10px] text-graphite">FIRST DUEL — TIP</div>
              <h3 className="small-caps mt-0.5 text-xl font-bold leading-tight">{TIPS[tip].title}</h3>
            </div>
            <button
              type="button"
              className="stamp-btn label-type px-2 py-1 text-[9px]"
              onClick={() => {
                dismissTutorialTip("tipWelcome");
                dismissTutorialTip("tipMana");
                dismissTutorialTip("tipPlay");
                dismissTutorialTip("tipAttack");
                dismissTutorialTip("tipWin");
                dismissTutorialTip("tipTempo");
                onDismiss("tipWelcome");
              }}
            >
              Skip all
            </button>
          </div>
          <p className="mt-2 text-sm leading-snug text-ink">{TIPS[tip].body}</p>
          <div className="mt-3 flex items-center justify-between">
            <HandNote className="text-base">tap to keep going</HandNote>
            <StampButton
              size="sm"
              onClick={() => {
                dismissTutorialTip(tip);
                onDismiss(tip);
              }}
            >
              Got it
            </StampButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

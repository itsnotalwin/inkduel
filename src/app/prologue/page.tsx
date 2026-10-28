"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StampButton, HandNote } from "@/components/paper";
import { sound } from "@/lib/sound";
import { GAME_NAME } from "@/config";

/**
 * The prologue — a self-playing animated intro (the "onboarding video").
 * Six title-card scenes in the ink style, ~4.5s each, skippable, and the
 * final frame hands the player straight to the duel.
 */

const SCENE_MS = 4500;

function SceneInkBottle({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      <motion.path
        d="M92 34 C92 28 108 28 108 34 L108 40 L92 40 Z"
        fill="var(--color-paper-deep)"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        initial={{ opacity: 0 }}
        animate={play ? { opacity: 1 } : {}}
        transition={{ delay: 0.2 }}
      />
      <motion.path
        d="M80 44 C72 48 72 60 80 64 L120 64 C128 60 128 48 120 44 Z"
        fill="var(--color-paper)"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        initial={{ opacity: 0, y: 20 }}
        animate={play ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.5 }}
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.circle
          key={i}
          cx={94 + i * 4}
          cy={38}
          r={2.4}
          fill="var(--color-ink)"
          initial={{ y: -30, opacity: 0 }}
          animate={play ? { y: 0, opacity: [0, 1, 1, 0.6] } : {}}
          transition={{ delay: 1 + i * 0.25, duration: 0.7 }}
        />
      ))}
      {/* ink spreading across the page */}
      <motion.path
        d="M20 84 C40 76 60 88 84 82 C108 76 128 88 152 82 C166 78 178 84 184 82 L184 100 C150 106 110 100 70 104 C46 106 28 100 20 96 Z"
        fill="var(--color-ink)"
        initial={{ scaleX: 0, originX: 0 }}
        animate={play ? { scaleX: 1 } : {}}
        transition={{ delay: 1.8, duration: 1.6, ease: "easeInOut" }}
      />
      <motion.text
        x="100"
        y="70"
        textAnchor="middle"
        style={{ fontFamily: "var(--font-hand)", fontSize: 14, fill: "var(--color-graphite)" }}
        initial={{ opacity: 0 }}
        animate={play ? { opacity: 1 } : {}}
        transition={{ delay: 2.6 }}
      >
        it spills…
      </motion.text>
    </svg>
  );
}

function SceneCardsFan({ play }: { play: boolean }) {
  const cards = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      {cards.map((i) => (
        <motion.g
          key={i}
          initial={{ y: -120, rotate: -30, opacity: 0 }}
          animate={play ? { y: 0, rotate: (i - 2) * 8, opacity: 1 } : {}}
          transition={{ delay: 0.3 + i * 0.28, type: "spring", stiffness: 140, damping: 16 }}
          style={{ originX: "100px", originY: "120px" }}
        >
          <rect
            x={100 - 22 + (i - 2) * 24}
            y={26}
            width={44}
            height={62}
            rx={4}
            fill="var(--color-cardstock)"
            stroke="var(--color-ink)"
            strokeWidth="2.4"
          />
          <circle
            cx={100 - 22 + (i - 2) * 24 + 9}
            cy={36}
            r={5}
            fill="var(--color-ink)"
          />
          <path
            d={`M${100 - 22 + (i - 2) * 24 + 8} 62 L${100 - 22 + (i - 2) * 24 + 14} 50 L${100 - 22 + (i - 2) * 24 + 20} 62`}
            fill="none"
            stroke="var(--color-graphite)"
            strokeWidth="1.6"
          />
        </motion.g>
      ))}
    </svg>
  );
}

function SceneDuelists({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      <motion.g
        initial={{ x: -120, opacity: 0 }}
        animate={play ? { x: 0, opacity: 1 } : {}}
        transition={{ delay: 0.2, type: "spring", stiffness: 120, damping: 15 }}
      >
        <ellipse cx="52" cy="60" rx="26" ry="28" fill="var(--color-cardstock)" stroke="var(--color-ink)" strokeWidth="2.4" />
        <path d="M40 54 C42 46 62 46 64 54" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
        <circle cx="48" cy="58" r="1.8" fill="var(--color-ink)" />
        <circle cx="58" cy="58" r="1.8" fill="var(--color-ink)" />
        <text x="52" y="102" textAnchor="middle" style={{ fontFamily: "var(--font-hand)", fontSize: 13, fill: "var(--color-graphite)" }}>
          you
        </text>
      </motion.g>
      <motion.g
        initial={{ x: 120, opacity: 0 }}
        animate={play ? { x: 0, opacity: 1 } : {}}
        transition={{ delay: 0.7, type: "spring", stiffness: 120, damping: 15 }}
      >
        <ellipse cx="148" cy="60" rx="26" ry="28" fill="var(--color-cardstock)" stroke="var(--color-ink)" strokeWidth="2.4" />
        <path d="M136 52 C138 44 158 44 160 52" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
        <circle cx="144" cy="58" r="1.8" fill="var(--color-ink)" />
        <circle cx="154" cy="58" r="1.8" fill="var(--color-ink)" />
        <text x="148" y="102" textAnchor="middle" style={{ fontFamily: "var(--font-hand)", fontSize: 13, fill: "var(--color-graphite)" }}>
          them
        </text>
      </motion.g>
      <motion.path
        d="M92 30 L92 88"
        stroke="var(--color-pencil)"
        strokeWidth="2"
        strokeDasharray="6 5"
        initial={{ pathLength: 0 }}
        animate={play ? { pathLength: 1 } : {}}
        transition={{ delay: 1.2, duration: 0.6 }}
      />
      <motion.text
        x="100"
        y="52"
        textAnchor="middle"
        style={{ fontFamily: "var(--font-hand)", fontSize: 16, fill: "var(--color-graphite)" }}
        initial={{ opacity: 0 }}
        animate={play ? { opacity: 1 } : {}}
        transition={{ delay: 1.9 }}
      >
        vs
      </motion.text>
    </svg>
  );
}

function SceneGolems({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={play ? { scale: 1, opacity: 1 } : {}}
        transition={{ delay: 0.3, type: "spring", stiffness: 180, damping: 14 }}
        style={{ originX: "60px", originY: "90px" }}
      >
        <rect x="42" y="52" width="36" height="34" rx="4" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.4" />
        <rect x="50" y="34" width="20" height="18" rx="3" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.4" />
        <circle cx="56" cy="42" r="2" fill="var(--color-ink)" />
        <circle cx="64" cy="42" r="2" fill="var(--color-ink)" />
      </motion.g>
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={play ? { scale: 1, opacity: 1 } : {}}
        transition={{ delay: 0.9, type: "spring", stiffness: 180, damping: 14 }}
        style={{ originX: "140px", originY: "90px" }}
      >
        <rect x="122" y="56" width="36" height="30" rx="4" fill="var(--color-paper-deep)" stroke="var(--color-ink)" strokeWidth="2.4" />
        <rect x="130" y="40" width="20" height="16" rx="3" fill="var(--color-paper-deep)" stroke="var(--color-ink)" strokeWidth="2.4" />
        <circle cx="136" cy="47" r="2" fill="var(--color-ink)" />
        <circle cx="144" cy="47" r="2" fill="var(--color-ink)" />
      </motion.g>
      {/* red pen bolt */}
      <motion.path
        d="M84 30 L110 44"
        stroke="var(--color-red-stamp)"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={play ? { pathLength: [0, 1, 1], opacity: [1, 1, 0] } : {}}
        transition={{ delay: 1.5, duration: 0.8 }}
      />
      <motion.circle
        cx="114"
        cy="46"
        r="10"
        fill="none"
        stroke="var(--color-red-stamp)"
        strokeWidth="2.5"
        initial={{ scale: 0, opacity: 1 }}
        animate={play ? { scale: [0, 1.4], opacity: [1, 0] } : {}}
        transition={{ delay: 2.1, duration: 0.5 }}
      />
    </svg>
  );
}

function SceneArchive({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      <motion.rect
        x="52"
        y="24"
        width="96"
        height="64"
        fill="var(--color-cardstock)"
        stroke="var(--color-ink)"
        strokeWidth="2.4"
        initial={{ rotate: -8, opacity: 0 }}
        animate={play ? { rotate: 0, opacity: 1 } : {}}
        transition={{ delay: 0.3, type: "spring", stiffness: 160, damping: 15 }}
        style={{ originX: "100px", originY: "56px" }}
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.rect
          key={i}
          x={62 + (i % 2) * 40}
          y={32 + Math.floor(i / 2) * 18}
          width="30"
          height="12"
          fill="var(--color-paper-deep)"
          stroke="var(--color-ink)"
          strokeWidth="1.4"
          initial={{ opacity: 0, y: 8 }}
          animate={play ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 + i * 0.15 }}
        />
      ))}
      <motion.text
        x="100"
        y="104"
        textAnchor="middle"
        style={{ fontFamily: "var(--font-type)", fontSize: 11, fill: "var(--color-graphite)", letterSpacing: 2 }}
        initial={{ opacity: 0 }}
        animate={play ? { opacity: 1 } : {}}
        transition={{ delay: 1.8 }}
      >
        96 CARDS. 12 KEEPERS. 1 LADDER.
      </motion.text>
    </svg>
  );
}

const SCENES = [
  { text: "In a notebook, worlds are drawn in ink.", Scene: SceneInkBottle },
  { text: "Paper becomes legions. Stamps become spells.", Scene: SceneCardsFan },
  { text: "Two duelists. One pen between them.", Scene: SceneDuelists },
  { text: "Summon golems. Hurl red pens. Twist the plot.", Scene: SceneGolems },
  { text: "The Archive keeps the score of every duel.", Scene: SceneArchive },
];

export default function ProloguePage() {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = scene >= SCENES.length; // final handoff frame

  const advance = useCallback(() => {
    setScene((s) => {
      const next = s + 1;
      sound.pop();
      return next;
    });
  }, []);

  useEffect(() => {
    if (!playing || reduce || last) return;
    const t = window.setTimeout(advance, SCENE_MS);
    return () => window.clearTimeout(t);
  }, [playing, scene, reduce, last, advance]);

  // stamp thunk per scene change
  useEffect(() => {
    if (scene > 0 && scene <= SCENES.length) sound.stampThunk();
  }, [scene]);

  const finish = () => {
    window.localStorage.setItem("inkduel:seenPrologue", "1");
    window.location.href = "/duel";
  };

  const skip = () => {
    window.localStorage.setItem("inkduel:seenPrologue", "1");
    window.location.href = "/";
  };

  const active = SCENES[Math.min(scene, SCENES.length - 1)];
  const Scene = active.Scene;
  const isFinal = scene >= SCENES.length;

  return (
    <main
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden p-6"
      onClick={() => {
        if (!last) advance();
      }}
    >
      {/* paper vignette frames the scene like a film cell */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(23,20,15,0.22) 100%)" }}
      />

      <AnimatePresence mode="wait">
        {!isFinal ? (
          <motion.section
            key={scene}
            className="relative flex w-full max-w-3xl flex-col items-center gap-6"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.45 }}
          >
            <div className="ink-frame relative w-full" style={{ minHeight: "46vh" }}>
              <div className="h-[46vh] w-full p-4">
                <Scene play={!reduce} />
              </div>
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-16"
                style={{ background: "linear-gradient(to top, var(--color-paper), transparent)" }}
              />
            </div>
            <motion.p
              className="font-hand max-w-xl text-center text-3xl leading-snug text-ink"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {active.text}
            </motion.p>
            <div className="flex items-center gap-2" aria-hidden>
              {SCENES.map((_, i) => (
                <span
                  key={i}
                  className="block h-1.5 w-6 rounded-full"
                  style={{ background: i <= scene ? "var(--color-ink)" : "var(--color-pencil)" }}
                />
              ))}
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="final"
            className="relative flex flex-col items-center gap-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h1
              className="small-caps text-6xl font-bold md:text-8xl"
              initial={reduce ? { opacity: 0 } : { scale: 2.6, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
            >
              {GAME_NAME}
            </motion.h1>
            <HandNote className="text-3xl">your page is blank. pick up the pen.</HandNote>
            <div onClick={() => sound.stampThunk()}>
              <Link href="/duel">
                <StampButton size="lg" className="text-2xl">
                  BEGIN THE FIRST DUEL
                </StampButton>
              </Link>
            </div>
            <div className="flex gap-6">
              <Link href="/campaign" className="label-type text-xs underline">
                or scout the campaign →
              </Link>
              <button type="button" className="label-type text-xs text-graphite underline" onClick={finish}>
                replay later from home
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* controls */}
      <div className="fixed bottom-5 right-5 flex gap-2">
        {!isFinal && (
          <>
            <StampButton size="sm" onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </StampButton>
            <StampButton size="sm" onClick={advance}>
              Next
            </StampButton>
          </>
        )}
        <StampButton size="sm" onClick={skip}>
          Skip Intro
        </StampButton>
      </div>
      {!isFinal && (
        <p className="font-hand pointer-events-none fixed bottom-6 left-6 text-lg text-graphite">
          tap anywhere to continue
        </p>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { HandNote, Panel, Stamp, StampButton, WashiTape } from "@/components/paper";
import { ambient } from "@/lib/ambient";
import { sound } from "@/lib/sound";
import { GAME_NAME } from "@/config";
import manifest from "@/data/voice-lines.json";
import {
  PROLOGUE_LINE_IDS,
  playVoiceWithEnd,
  preloadVoices,
  readPrologueVoicePref,
  setPrologueVoicePref,
  stopVoice,
} from "@/lib/voice";

/**
 * The prologue — an animated graphic-novel cold open. On a near-black desk a
 * paper sheet slams down, the title letterpress-stamps itself letter by
 * letter, and five acts of self-drawing ink sketches carry the narrated
 * backstory (one voice line per scene) before the dueling table assembles and
 * the PLAY stamp slams the player into /duel. The Begin gate starts the film
 * on a user gesture so the narration (streamed from /voice, silent when
 * missing/offline/muted) is allowed to play.
 */

const ACT_CARD_MS = 2800;
/** Auto-advance holds each page roughly as long as its voice line runs (~55ms per spoken character). */
const holdFor = (text: string) => Math.min(11000, Math.max(4600, text.length * 55 + 1600));

const NARRATION: string[] = manifest.lines
  .filter((line) => line.group === "prologue")
  .map((line) => line.text);
const lineText = (i: number) => NARRATION[i] ?? "";

type Art = (props: { play: boolean }) => ReactElement;

/* ── drawing helpers ─────────────────────────────────────────── */

/** A hand-drawn stroke that inks itself in (pathLength) — or sits fully drawn under reduced motion. */
function Stroke({
  d,
  play,
  delay = 0,
  duration = 0.8,
  w = 3,
  color = "var(--color-ink)",
}: {
  d: string;
  play: boolean;
  delay?: number;
  duration?: number;
  w?: number;
  color?: string;
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={play ? { pathLength: 0 } : false}
      animate={play ? { pathLength: 1 } : undefined}
      transition={{ delay, duration, ease: "easeInOut" }}
    />
  );
}

function InkDot({
  cx,
  cy,
  play,
  delay = 0,
  r = 2.4,
  color = "var(--color-ink)",
}: {
  cx: number;
  cy: number;
  play: boolean;
  delay?: number;
  r?: number;
  color?: string;
}) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      fill={color}
      initial={play ? { opacity: 0 } : false}
      animate={play ? { opacity: 1 } : undefined}
      transition={{ delay, duration: 0.25 }}
    />
  );
}

/** Handwritten margin note inside the art (static transform, animated opacity). */
function HandLabel({
  x,
  y,
  play,
  delay = 0,
  size = 15,
  color = "var(--color-graphite)",
  rotate = 0,
  children,
}: {
  x: number;
  y: number;
  play: boolean;
  delay?: number;
  size?: number;
  color?: string;
  rotate?: number;
  children: string;
}) {
  return (
    <motion.g
      initial={play ? { opacity: 0 } : false}
      animate={play ? { opacity: 1 } : undefined}
      transition={{ delay, duration: 0.4 }}
    >
      <text
        x={x}
        y={y}
        transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
        textAnchor="middle"
        style={{ fontFamily: "var(--font-hand)", fontSize: size, fill: color }}
      >
        {children}
      </text>
    </motion.g>
  );
}

/**
 * Ink-bleed: an SVG displacement filter whose scale is animated by SMIL from
 * `peak` down to 0 when the scene mounts, so headlines and art look like they
 * soak into the fiber and then settle crisp. Untriggered (reduced motion) the
 * scale stays 0 — a clean identity filter.
 */
function InkBleed({ id, play, peak = 10, seed = 7 }: { id: string; play: boolean; peak?: number; seed?: number }) {
  const animateRef = useRef<SVGAnimateElement | null>(null);
  useEffect(() => {
    if (!play) return;
    try {
      animateRef.current?.beginElement();
    } catch {
      /* no SMIL — the text simply stays crisp */
    }
  }, [play]);
  return (
    <svg aria-hidden className="pointer-events-none absolute" style={{ width: 0, height: 0 }}>
      <filter id={id} x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05 0.11" numOctaves="2" seed={seed} stitchTiles="stitch" result="grain" />
        <feDisplacementMap in="SourceGraphic" in2="grain" scale="0" xChannelSelector="R" yChannelSelector="G">
          <animate
            ref={animateRef}
            attributeName="scale"
            values={`${peak};${Math.round(peak * 0.35)};0`}
            keyTimes="0;0.55;1"
            dur="1.25s"
            begin="indefinite"
            fill="freeze"
          />
        </feDisplacementMap>
      </filter>
    </svg>
  );
}

/** Red-ink splat burst — flashes once (300ms) and fades, used behind stamps. */
function InkBurst({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      initial={{ opacity: 0.95, scale: 0.5, rotate: -10 }}
      animate={{ opacity: 0, scale: 1.2, rotate: 5 }}
      transition={{ delay, duration: 0.34, ease: "easeOut" }}
    >
      <g fill="var(--color-red-stamp)">
        <circle cx="50" cy="50" r="24" />
        <circle cx="28" cy="40" r="9" />
        <circle cx="71" cy="36" r="8" />
        <circle cx="66" cy="68" r="10" />
        <circle cx="34" cy="64" r="8" />
        <circle cx="50" cy="21" r="7" />
        <path d="M50 50 L20 12 L38 30 Z" />
        <path d="M50 50 L86 22 L70 42 Z" />
        <path d="M50 50 L84 78 L64 64 Z" />
        <path d="M50 50 L18 74 L32 56 Z" />
      </g>
    </motion.svg>
  );
}

/* ── act I — the blank page ──────────────────────────────────── */

function SceneBlankPage({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M130 36 C186 30 258 32 286 38 C292 94 292 150 286 198 C230 206 172 204 128 198 C120 144 122 90 130 36 Z" delay={0.15} duration={1.1} />
      <Stroke play={play} d="M148 92 C190 88 244 90 268 92" delay={0.75} duration={0.4} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M148 124 C196 120 240 122 268 124" delay={0.9} duration={0.4} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M148 156 C186 152 244 154 268 156" delay={1.05} duration={0.4} w={2} color="var(--color-graphite)" />
      {/* the reader's pen, drawing itself */}
      <Stroke play={play} d="M196 138 C196 130 204 130 204 138 L208 154 L200 164 L192 154 Z" delay={1.25} duration={0.45} w={2.5} />
      <Stroke play={play} d="M200 140 L200 160" delay={1.6} duration={0.2} w={1.5} color="var(--color-graphite)" />
      <Stroke play={play} d="M200 138 C198 122 202 112 200 96" delay={1.7} duration={0.4} w={2.5} />
      <InkDot cx={200} cy={176} play={play} delay={1.95} r={3} />
      <Stroke play={play} d="M218 180 L208 178" delay={2.1} duration={0.2} w={1.5} color="var(--color-graphite)" />
      <HandLabel x={230} y={184} play={play} delay={2.15} rotate={5}>
        you
      </HandLabel>
    </svg>
  );
}

function SceneHungryPage({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M130 36 C186 30 258 32 286 38 C292 94 292 150 286 198 C230 206 172 204 128 198 C120 144 122 90 130 36 Z" delay={0.15} duration={1.0} />
      {/* the open mouth */}
      <Stroke play={play} d="M156 104 C170 90 236 90 250 104 C244 142 162 144 156 104 Z" delay={0.8} duration={0.7} w={3.5} />
      <Stroke play={play} d="M166 102 L178 112 L190 102 L202 112 L214 102 L226 112 L238 102" delay={1.4} duration={0.5} w={2} />
      {/* hunger pangs */}
      <Stroke play={play} d="M138 96 C132 106 132 118 138 128" delay={1.8} duration={0.35} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M268 96 C274 106 274 118 268 128" delay={1.95} duration={0.35} w={2} color="var(--color-graphite)" />
      <InkDot cx={200} cy={158} play={play} delay={2.2} r={3} />
      <HandLabel x={200} y={182} play={play} delay={2.3} rotate={-3}>
        so hungry
      </HandLabel>
    </svg>
  );
}

function SceneBureau({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      {/* the Bureau of Written Things */}
      <Stroke play={play} d="M96 196 C96 178 96 158 96 140 C122 136 148 136 172 140 C172 158 172 178 172 196" delay={0.15} duration={0.9} />
      <Stroke play={play} d="M90 140 C118 122 150 122 178 140" delay={0.6} duration={0.5} />
      <Stroke play={play} d="M114 150 L114 190" delay={0.9} duration={0.3} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M134 150 L134 190" delay={1.0} duration={0.3} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M154 150 L154 190" delay={1.1} duration={0.3} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M64 200 C160 194 260 194 348 200" delay={0.4} duration={0.7} />
      {/* paper swans carrying the mail */}
      <Stroke play={play} d="M52 84 C60 90 74 90 82 82 C86 74 84 64 76 62" delay={1.3} duration={0.6} w={2.5} />
      <Stroke play={play} d="M60 84 C64 78 70 78 74 82" delay={1.7} duration={0.3} w={1.8} color="var(--color-graphite)" />
      <InkDot cx={76} cy={62} play={play} delay={1.9} r={1.8} />
      <Stroke play={play} d="M104 64 C112 70 126 70 134 62 C138 54 136 44 128 42" delay={1.5} duration={0.6} w={2.5} />
      <Stroke play={play} d="M112 64 C116 58 122 58 126 62" delay={1.9} duration={0.3} w={1.8} color="var(--color-graphite)" />
      <InkDot cx={128} cy={42} play={play} delay={2.1} r={1.8} />
      {/* a paper dragon guarding the vault */}
      <Stroke play={play} d="M276 196 C274 182 274 166 276 152 C296 148 316 148 336 152 C338 166 338 182 336 196" delay={1.2} duration={0.8} />
      <InkDot cx={298} cy={172} play={play} delay={1.8} r={4.5} />
      <Stroke play={play} d="M296 176 L300 186 L304 176" delay={1.9} duration={0.2} w={2} />
      <Stroke play={play} d="M282 150 C288 128 322 124 334 102 C340 88 326 78 316 86 C308 92 312 104 322 104" delay={1.6} duration={0.9} w={2.5} />
      <Stroke play={play} d="M322 104 L338 98 L330 108 L340 114 L324 112" delay={2.2} duration={0.35} w={2.5} />
      <InkDot cx={326} cy={98} play={play} delay={2.45} r={1.8} />
      <HandLabel x={200} y={224} play={play} delay={2.5}>
        a quiet century
      </HandLabel>
    </svg>
  );
}

/* ── act II — the great blot ─────────────────────────────────── */

function SceneGreatBlot({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M130 36 C186 30 258 32 286 38 C292 94 292 150 286 198 C230 206 172 204 128 198 C120 144 122 90 130 36 Z" delay={0.15} duration={1.0} />
      <Stroke play={play} d="M146 78 C190 74 240 76 268 78" delay={0.7} duration={0.4} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M146 104 C186 100 246 102 268 104" delay={0.85} duration={0.4} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M146 130 C196 126 236 128 268 130" delay={1.0} duration={0.4} w={2} color="var(--color-graphite)" />
      {/* the blot spreads and drinks the lower shelves */}
      <motion.path
        d="M288 202 C250 208 218 196 216 168 C214 148 232 134 252 142 C256 124 280 118 292 132 C306 124 322 136 318 152 C330 160 328 180 314 190 C308 200 298 206 288 202 Z"
        fill="var(--color-ink)"
        initial={play ? { scale: 0 } : false}
        animate={play ? { scale: [0, 1, 1.04, 1] } : undefined}
        transition={play ? { delay: 1.2, duration: 1.6, times: [0, 0.55, 0.8, 1], ease: "easeOut" } : undefined}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <motion.path
        d="M252 142 C250 122 264 104 284 98"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={5}
        strokeLinecap="round"
        initial={play ? { pathLength: 0 } : false}
        animate={play ? { pathLength: 1 } : undefined}
        transition={{ delay: 1.9, duration: 0.5 }}
      />
      <motion.path
        d="M292 132 C300 112 318 102 336 100"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={4}
        strokeLinecap="round"
        initial={play ? { pathLength: 0 } : false}
        animate={play ? { pathLength: 1 } : undefined}
        transition={{ delay: 2.1, duration: 0.45 }}
      />
      <InkDot cx={228} cy={196} play={play} delay={2.3} r={3.5} />
      <InkDot cx={214} cy={206} play={play} delay={2.5} r={2.2} />
      <HandLabel x={186} y={52} play={play} delay={2.6} rotate={-4}>
        half-erased
      </HandLabel>
    </svg>
  );
}

function SceneSealedWing({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      {/* the sealed wing */}
      <Stroke play={play} d="M148 44 C147 96 147 152 148 200" delay={0.15} duration={0.7} />
      <Stroke play={play} d="M252 44 C253 96 253 152 252 200" delay={0.3} duration={0.7} />
      <Stroke play={play} d="M140 44 C180 40 220 40 260 44" delay={0.5} duration={0.4} />
      <Stroke play={play} d="M136 200 C180 204 220 204 264 200" delay={0.6} duration={0.4} />
      <Stroke play={play} d="M200 46 L200 198" delay={0.7} duration={0.5} w={2.5} />
      <Stroke play={play} d="M158 62 C172 60 184 60 188 62 C189 78 189 94 188 110 C174 112 162 112 158 110 C157 94 157 78 158 62 Z" delay={0.9} duration={0.6} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M212 62 C226 60 238 60 242 62 C243 78 243 94 242 110 C228 112 216 112 212 110 C211 94 211 78 212 62 Z" delay={1.0} duration={0.6} w={2} color="var(--color-graphite)" />
      {/* the wax seal, cracked */}
      <Stroke play={play} d="M200 118 C210 118 216 124 216 132 C216 141 209 147 200 147 C191 147 184 141 184 132 C184 124 190 118 200 118 Z" delay={1.3} duration={0.5} w={3} color="var(--color-red-stamp)" />
      <Stroke play={play} d="M190 122 L197 130 L193 137 L203 143" delay={1.75} duration={0.35} w={2.5} color="var(--color-red-stamp)" />
      {/* the burned catalog */}
      <Stroke play={play} d="M116 196 C114 186 124 182 126 190 C128 184 136 186 134 194" delay={1.9} duration={0.5} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M124 198 C126 190 134 190 134 196" delay={2.1} duration={0.3} w={2} color="var(--color-graphite)" />
      <HandLabel x={200} y={172} play={play} delay={2.2} rotate={-3}>
        sealed
      </HandLabel>
      <HandLabel x={304} y={52} play={play} delay={2.4} rotate={5} size={14}>
        nothing written
      </HandLabel>
    </svg>
  );
}

/* ── act III — the doodler ───────────────────────────────────── */

function SceneDoodlerHero({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      {/* a scrap of cape */}
      <Stroke play={play} d="M186 104 C158 112 146 138 120 152 C138 154 152 146 162 134 C160 142 164 148 172 148" delay={0.9} duration={0.7} w={2.5} color="var(--color-graphite)" />
      {/* the blunt pencil, standing proud */}
      <Stroke play={play} d="M186 96 C186 128 186 160 186 190 C196 195 204 195 214 190 C214 160 214 128 214 96 C205 91 195 91 186 96 Z" delay={0.15} duration={1.0} />
      <Stroke play={play} d="M186 96 L191 72 L209 72 L214 96" delay={0.75} duration={0.4} />
      <Stroke play={play} d="M191 72 L209 72" delay={1.05} duration={0.15} w={5} />
      <Stroke play={play} d="M187 88 C195 84 205 84 213 88" delay={1.15} duration={0.3} w={1.5} color="var(--color-graphite)" />
      <Stroke play={play} d="M195 92 L195 191" delay={1.3} duration={0.4} w={1.2} color="var(--color-pencil)" />
      <Stroke play={play} d="M205 92 L205 192" delay={1.4} duration={0.4} w={1.2} color="var(--color-pencil)" />
      <Stroke play={play} d="M164 196 C184 204 216 204 236 196" delay={1.7} duration={0.4} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M172 206 C188 212 212 212 228 206" delay={1.85} duration={0.4} w={2} color="var(--color-graphite)" />
      <HandLabel x={290} y={62} play={play} delay={2.1} rotate={6} size={15}>
        blunt. willing.
      </HandLabel>
      <HandLabel x={126} y={92} play={play} delay={2.3} rotate={-8} size={14}>
        a doodle in a margin
      </HandLabel>
    </svg>
  );
}

function SceneInkPower({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M156 156 C146 166 146 188 158 196 C178 205 182 205 202 196 C214 188 214 166 204 156 Z" delay={0.15} duration={0.9} />
      <Stroke play={play} d="M166 156 L166 142 C166 136 194 136 194 142 L194 156" delay={0.75} duration={0.5} />
      <Stroke play={play} d="M168 136 C168 128 192 128 192 136" delay={1.0} duration={0.35} />
      <Stroke play={play} d="M164 172 C172 168 178 176 186 172 C194 168 200 176 206 172" delay={1.15} duration={0.5} w={2} color="var(--color-graphite)" />
      {/* the swirl of power */}
      <Stroke play={play} d="M180 124 C176 104 206 100 212 84 C218 66 190 56 180 70 C172 82 190 92 198 80" delay={1.3} duration={1.0} />
      <Stroke play={play} d="M232 74 L250 64" delay={2.0} duration={0.2} w={2.5} />
      <Stroke play={play} d="M238 102 L258 100" delay={2.1} duration={0.2} w={2.5} />
      <Stroke play={play} d="M148 88 L128 80" delay={2.2} duration={0.2} w={2.5} />
      <HandLabel x={282} y={46} play={play} delay={2.3} rotate={5}>
        the paper bends
      </HandLabel>
    </svg>
  );
}

function SceneMockers({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M118 98 C142 58 244 54 272 92 C298 130 232 152 198 148 C158 143 104 138 118 98" delay={0.1} duration={1.0} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M168 88 C166 62 238 60 236 88 C234 114 170 116 168 88 Z" delay={0.6} duration={0.8} />
      <Stroke play={play} d="M188 80 L204 74" delay={1.3} duration={0.2} w={2.5} />
      <Stroke play={play} d="M218 74 L234 80" delay={1.4} duration={0.2} w={2.5} />
      <InkDot cx={198} cy={88} play={play} delay={1.45} />
      <InkDot cx={226} cy={88} play={play} delay={1.5} />
      <Stroke play={play} d="M184 96 C200 110 226 108 234 94" delay={1.55} duration={0.4} />
      <Stroke play={play} d="M202 102 L202 107" delay={1.75} duration={0.15} w={1.5} />
      <Stroke play={play} d="M214 104 L214 108" delay={1.8} duration={0.15} w={1.5} />
      <Stroke play={play} d="M182 116 C176 142 228 146 222 118" delay={1.85} duration={0.6} w={2.5} color="var(--color-graphite)" />
      <HandLabel x={122} y={54} play={play} delay={2.0} rotate={-10} size={19} color="var(--color-ink)">
        HA
      </HandLabel>
      <HandLabel x={298} y={58} play={play} delay={2.15} rotate={8} size={19} color="var(--color-ink)">
        HA
      </HandLabel>
      <HandLabel x={146} y={146} play={play} delay={2.3} rotate={-4} size={19} color="var(--color-ink)">
        HA
      </HandLabel>
    </svg>
  );
}

/* ── act IV — the duels ──────────────────────────────────────── */

function SceneDuelTable({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M70 196 C150 188 250 188 330 196" delay={0.15} duration={0.8} />
      <Stroke play={play} d="M92 198 L88 216" delay={0.7} duration={0.25} />
      <Stroke play={play} d="M308 198 L312 216" delay={0.8} duration={0.25} />
      <Stroke play={play} d="M200 108 C201 136 199 166 200 196" delay={0.9} duration={0.5} w={2} color="var(--color-graphite)" />
      {/* the two pages take their seats */}
      <Stroke play={play} d="M104 122 C120 118 140 120 148 122 C150 140 148 158 146 172 C128 176 116 174 106 172 C102 156 102 138 104 122 Z" delay={1.1} duration={0.6} w={2.5} />
      <Stroke play={play} d="M252 122 C260 120 280 118 296 122 C298 138 298 156 294 172 C284 174 264 176 254 172 C250 158 250 140 252 122 Z" delay={1.3} duration={0.6} w={2.5} />
      {/* crossed pens over the table */}
      <Stroke play={play} d="M172 58 L206 92" delay={1.6} duration={0.35} />
      <Stroke play={play} d="M228 58 L194 92" delay={1.75} duration={0.35} />
      <Stroke play={play} d="M186 46 L192 54" delay={2.0} duration={0.15} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M214 46 L208 54" delay={2.05} duration={0.15} w={2} color="var(--color-graphite)" />
      <InkDot cx={200} cy={75} play={play} delay={2.1} r={2.5} color="var(--color-red-stamp)" />
      <HandLabel x={200} y={36} play={play} delay={2.2} rotate={-2} size={15}>
        a hand strong enough
      </HandLabel>
    </svg>
  );
}

function SceneFoldGuardStrike({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M154 60 C188 56 222 58 248 62 C250 96 248 130 248 158 C214 163 182 161 154 158 C150 124 152 92 154 60 Z" delay={0.15} duration={0.8} />
      <Stroke play={play} d="M154 60 L248 158" delay={0.95} duration={0.35} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M248 62 L154 158" delay={1.05} duration={0.35} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M154 60 L201 109 L154 158" delay={1.2} duration={0.5} w={2.5} />
      <Stroke play={play} d="M120 108 C104 132 114 158 138 166" delay={1.5} duration={0.5} />
      <Stroke play={play} d="M128 114 C118 132 126 152 140 158" delay={1.62} duration={0.45} w={2} color="var(--color-graphite)" />
      {/* the strike, in red ink */}
      <Stroke play={play} d="M272 52 L222 100 L244 102 L200 146" delay={1.95} duration={0.3} w={4.5} color="var(--color-red-stamp)" />
      <Stroke play={play} d="M188 152 L172 160" delay={2.2} duration={0.15} w={3} color="var(--color-red-stamp)" />
      <Stroke play={play} d="M192 136 L180 126" delay={2.25} duration={0.15} w={3} color="var(--color-red-stamp)" />
      <Stroke play={play} d="M206 158 L202 172" delay={2.3} duration={0.15} w={3} color="var(--color-red-stamp)" />
      <HandLabel x={266} y={84} play={play} delay={1.25} rotate={4} size={14}>
        fold
      </HandLabel>
      <HandLabel x={106} y={184} play={play} delay={1.7} size={14}>
        guard
      </HandLabel>
      <HandLabel x={286} y={144} play={play} delay={2.35} rotate={6} size={14} color="var(--color-red-stamp)">
        strike
      </HandLabel>
    </svg>
  );
}

function ScenePagesRemember({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M196 60 C160 52 122 54 90 64 C88 102 90 144 94 178 C128 168 164 166 196 170" delay={0.15} duration={0.9} />
      <Stroke play={play} d="M204 60 C240 52 278 54 310 64 C312 102 310 144 306 178 C272 168 236 166 204 170" delay={0.35} duration={0.9} />
      <Stroke play={play} d="M200 54 C200 100 200 150 200 186" delay={0.8} duration={0.5} w={2.5} />
      <Stroke play={play} d="M108 92 C140 86 168 88 186 92" delay={1.1} duration={0.4} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M108 118 C142 112 166 114 186 118" delay={1.25} duration={0.4} w={2} color="var(--color-graphite)" />
      {/* the quill, still writing */}
      <Stroke play={play} d="M262 92 C270 76 282 66 296 60" delay={1.5} duration={0.5} w={2.5} />
      <Stroke play={play} d="M262 92 L256 102" delay={1.9} duration={0.15} w={2.5} />
      <Stroke play={play} d="M220 96 C244 90 262 92 282 96" delay={2.0} duration={0.4} w={2} color="var(--color-graphite)" />
      {/* every duel ever fought */}
      <Stroke play={play} d="M128 148 L138 158 M138 148 L128 158" delay={2.2} duration={0.3} w={1.5} color="var(--color-pencil)" />
      <Stroke play={play} d="M148 140 L158 150 M158 140 L148 150" delay={2.3} duration={0.3} w={1.5} color="var(--color-pencil)" />
      <HandLabel x={258} y={204} play={play} delay={2.5} rotate={-3}>
        yours, today
      </HandLabel>
    </svg>
  );
}

/* ── act V — today ───────────────────────────────────────────── */

function SceneDuelBegins({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M64 202 C150 194 250 194 336 202" delay={0.15} duration={0.7} />
      <Stroke play={play} d="M100 100 C122 96 146 98 156 100 C158 126 156 150 154 170 C132 174 112 172 100 170 C96 146 97 122 100 100 Z" delay={0.5} duration={0.7} />
      <InkDot cx={122} cy={132} play={play} delay={1.05} />
      <InkDot cx={140} cy={132} play={play} delay={1.1} />
      <Stroke play={play} d="M120 144 C126 148 134 148 140 144" delay={1.15} duration={0.25} w={2} />
      <Stroke play={play} d="M244 100 C266 96 290 98 300 100 C302 126 300 150 298 170 C276 174 256 172 244 170 C240 146 241 122 244 100 Z" delay={0.75} duration={0.7} />
      <Stroke play={play} d="M258 124 L268 120" delay={1.3} duration={0.15} w={2} />
      <Stroke play={play} d="M280 120 L290 124" delay={1.35} duration={0.15} w={2} />
      <InkDot cx={266} cy={132} play={play} delay={1.4} />
      <InkDot cx={284} cy={132} play={play} delay={1.45} />
      <Stroke play={play} d="M262 148 C270 150 280 148 286 142" delay={1.5} duration={0.25} w={2} />
      {/* the pen comes down between them */}
      <Stroke play={play} d="M200 118 L200 172" delay={1.6} duration={0.4} w={2.5} />
      <Stroke play={play} d="M195 172 L205 172 L202 184 L200 188 L198 184 Z" delay={1.75} duration={0.3} w={2.5} />
      <Stroke play={play} d="M148 208 C182 204 218 204 252 208" delay={2.0} duration={0.35} w={3} color="var(--color-red-stamp)" />
      <HandLabel x={200} y={86} play={play} delay={2.1} rotate={-3} size={25} color="var(--color-ink)">
        vs
      </HandLabel>
    </svg>
  );
}

function SceneArchivist({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M120 40 C118 100 118 160 120 200" delay={0.15} duration={0.7} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M280 40 C282 100 282 160 280 200" delay={0.3} duration={0.7} w={2} color="var(--color-graphite)" />
      {/* the keyhole, and something looking back */}
      <motion.circle cx={200} cy={112} r={26} fill="var(--color-ink)" initial={play ? { opacity: 0 } : false} animate={play ? { opacity: 1 } : undefined} transition={{ delay: 1.0, duration: 0.4 }} />
      <motion.path d="M193 104 C196 100 204 100 207 104 C204 108 196 108 193 104 Z" fill="var(--color-cardstock)" initial={play ? { opacity: 0 } : false} animate={play ? { opacity: 1 } : undefined} transition={{ delay: 1.3, duration: 0.3 }} />
      <motion.path d="M195 112 L205 112 L212 134 L188 134 Z" fill="var(--color-cardstock)" initial={play ? { opacity: 0 } : false} animate={play ? { opacity: 1 } : undefined} transition={{ delay: 1.4, duration: 0.3 }} />
      <InkDot cx={200} cy={104} play={play} delay={1.6} r={2} color="var(--color-ink)" />
      {/* your name card, underlined in red */}
      <Stroke play={play} d="M164 164 L236 162 L238 186 L166 188 Z" delay={1.9} duration={0.5} w={2} />
      <Stroke play={play} d="M176 172 C190 170 210 170 226 172" delay={2.2} duration={0.35} w={1.5} color="var(--color-graphite)" />
      <Stroke play={play} d="M172 182 C190 178 214 178 230 181" delay={2.4} duration={0.35} w={3} color="var(--color-red-stamp)" />
      <HandLabel x={306} y={60} play={play} delay={2.6} rotate={6}>
        your name
      </HandLabel>
    </svg>
  );
}

/** The finale: the dueling table sketches itself in while the PLAY stamp waits. */
function SceneFinalTable({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <Stroke play={play} d="M86 44 C180 38 258 40 318 46 C326 92 324 142 318 186 C222 194 142 192 90 186 C82 140 82 92 86 44 Z" delay={0.15} duration={1.1} />
      <Stroke play={play} d="M200 54 C202 96 198 142 200 178" delay={1.0} duration={0.5} w={2} color="var(--color-graphite)" />
      <Stroke play={play} d="M118 96 C134 92 154 94 162 96 C164 116 162 136 160 152 C142 156 126 154 120 152 C115 132 116 114 118 96 Z" delay={1.2} duration={0.5} w={2.5} />
      <Stroke play={play} d="M238 96 C246 94 266 92 282 96 C284 114 285 132 280 152 C274 154 258 156 240 152 C238 136 236 116 238 96 Z" delay={1.35} duration={0.5} w={2.5} />
      <InkDot cx={128} cy={170} play={play} delay={1.5} r={3} color="var(--color-graphite)" />
      <InkDot cx={141} cy={170} play={play} delay={1.55} r={3} color="var(--color-graphite)" />
      <InkDot cx={154} cy={170} play={play} delay={1.6} r={3} color="var(--color-graphite)" />
      <InkDot cx={246} cy={170} play={play} delay={1.65} r={3} color="var(--color-graphite)" />
      <InkDot cx={259} cy={170} play={play} delay={1.7} r={3} color="var(--color-graphite)" />
      <InkDot cx={272} cy={170} play={play} delay={1.75} r={3} color="var(--color-graphite)" />
      <HandLabel x={200} y={216} play={play} delay={1.9}>
        the table is set
      </HandLabel>
    </svg>
  );
}

/* ── the film script ─────────────────────────────────────────── */

const SCENES: { title: string; text: string; Art: Art }[] = [
  { title: "THIS ONE STARTS WITH YOU", text: lineText(0), Art: SceneBlankPage },
  { title: "A HUNGRY PAGE", text: lineText(1), Art: SceneHungryPage },
  { title: "THE BUREAU OF WRITTEN THINGS", text: lineText(2), Art: SceneBureau },
  { title: "IT DRANK THE INK", text: lineText(3), Art: SceneGreatBlot },
  { title: "THE FIRST RULE", text: lineText(4), Art: SceneSealedWing },
  { title: "A DOODLE IN THE MARGIN", text: lineText(5), Art: SceneDoodlerHero },
  { title: "INK IS POWER", text: lineText(6), Art: SceneInkPower },
  { title: "THEY WILL MOCK YOU", text: lineText(7), Art: SceneMockers },
  { title: "THE ARCHIVISTS' DUELS", text: lineText(8), Art: SceneDuelTable },
  { title: "FOLD · GUARD · STRIKE", text: lineText(9), Art: SceneFoldGuardStrike },
  { title: "THE PAGES REMEMBER", text: lineText(10), Art: ScenePagesRemember },
  { title: "THE DUEL BEGINS", text: lineText(11), Art: SceneDuelBegins },
  { title: "ALREADY READING", text: lineText(12), Art: SceneArchivist },
];

const ACTS = [
  { numeral: "I", title: "THE BLANK PAGE" },
  { numeral: "II", title: "THE GREAT BLOT" },
  { numeral: "III", title: "THE DOODLER" },
  { numeral: "IV", title: "THE DUELS" },
  { numeral: "V", title: "TODAY" },
] as const;

type Frame = { kind: "act"; act: number } | { kind: "scene"; scene: number } | { kind: "finale" };

const FRAMES: Frame[] = [
  { kind: "act", act: 0 },
  { kind: "scene", scene: 0 },
  { kind: "scene", scene: 1 },
  { kind: "scene", scene: 2 },
  { kind: "act", act: 1 },
  { kind: "scene", scene: 3 },
  { kind: "scene", scene: 4 },
  { kind: "act", act: 2 },
  { kind: "scene", scene: 5 },
  { kind: "scene", scene: 6 },
  { kind: "scene", scene: 7 },
  { kind: "act", act: 3 },
  { kind: "scene", scene: 8 },
  { kind: "scene", scene: 9 },
  { kind: "scene", scene: 10 },
  { kind: "act", act: 4 },
  { kind: "scene", scene: 11 },
  { kind: "scene", scene: 12 },
  { kind: "finale" },
];
const FINAL_FRAME = FRAMES.length - 1;
const ACT_FIRST_FRAME = FRAMES.flatMap((f, i) => (f.kind === "act" ? [i] : []));

/** Page-turn motion props: a 3D lift-and-fall, or a plain crossfade under reduced motion. */
function turnProps(reduce: boolean) {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.45 } },
      exit: { opacity: 0, transition: { duration: 0.3 } },
    };
  }
  return {
    initial: { opacity: 0, rotateY: 30, x: 110 },
    animate: { opacity: 1, rotateY: 0, x: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
    exit: { opacity: 0, rotateY: -72, x: -80, transition: { duration: 0.34, ease: "easeIn" as const } },
  };
}

/** Act jump chips — click a numeral to skip straight to that act's title card. */
function ActChips({ frame, onJump }: { frame: number; onJump: (act: number) => void }) {
  let currentAct = 0;
  FRAMES.forEach((f, i) => {
    if (f.kind === "act" && i <= frame) currentAct = f.act;
  });
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {ACTS.map((a, i) => {
        const first = ACT_FIRST_FRAME[i];
        const cls =
          i === currentAct
            ? "border-ink bg-ink text-paper"
            : frame > first
              ? "border-ink text-ink"
              : "border-pencil text-pencil";
        return (
          <button
            key={a.numeral}
            type="button"
            onClick={() => onJump(i)}
            title={`Act ${a.numeral} — ${a.title}`}
            aria-label={`Skip to act ${a.numeral}, ${a.title}`}
            className={`label-type rounded-[4px] border px-2 py-1 text-[10px] leading-none transition-colors ${cls}`}
          >
            {a.numeral}
          </button>
        );
      })}
    </div>
  );
}

/** The corner quill — it bobs while it "writes" the current line number. */
function QuillCounter({ label, play, reduce }: { label: string; play: boolean; reduce: boolean }) {
  return (
    <div className="pointer-events-none fixed left-3 top-3 z-20 flex items-center gap-2 sm:left-5 sm:top-5">
      <motion.svg
        viewBox="0 0 40 40"
        className="h-8 w-8"
        animate={play && !reduce ? { rotate: [0, -6, 3, 0] } : undefined}
        transition={play && !reduce ? { repeat: Infinity, duration: 1.8, ease: "easeInOut" } : undefined}
      >
        <path d="M10 32 C12 20 20 8 34 4 C30 12 27 20 22 28 C19 33 13 34 10 32 Z" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M15 24 C19 20 24 14 29 9" fill="none" stroke="var(--color-graphite)" strokeWidth="1.2" />
        <path d="M10 32 L5 37" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
      </motion.svg>
      <motion.span
        key={label}
        className="font-hand text-lg leading-none text-graphite"
        initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: "inset(-25% 100% -25% 0)" }}
        animate={{ opacity: 1, clipPath: "inset(-25% -10% -25% 0)" }}
        transition={reduce ? { duration: 0.3 } : { duration: 0.7, ease: "easeOut" }}
      >
        {label}
      </motion.span>
    </div>
  );
}

export default function ProloguePage() {
  const reduce = useReducedMotion() ?? false;
  // the sheet shudders when an act card slams down
  const sheetControls = useAnimationControls();
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [started, setStarted] = useState(false); // the timer + narration wait for the Begin gesture
  const [voiceOn, setVoiceOn] = useState(true);
  const [slammed, setSlammed] = useState(false); // the PLAY stamp has landed on the finale
  const lastLineRef = useRef<string | null>(null);
  const timersRef = useRef<number[]>([]);
  useEffect(
    () => () => {
      for (const t of timersRef.current) window.clearTimeout(t);
    },
    [],
  );
  const isFinal = frame >= FINAL_FRAME;

  const advance = useCallback(() => {
    setFrame((f) => Math.min(f + 1, FINAL_FRAME));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of the persisted narration preference
    setVoiceOn(readPrologueVoicePref());
  }, []);

  // the sheet slam of the cold open (inaudible before the first gesture; kept for gesture-unlocked replays)
  useEffect(() => {
    const t = window.setTimeout(() => sound.stampThunk(), 380);
    return () => window.clearTimeout(t);
  }, []);

  // THE DRIVER: with narration on, scene frames hold until the voice ends
  // (plus a breath) — perfect sync. Act cards, the finale, reduced motion and
  // voice-off fall back to the character-count timer.
  useEffect(() => {
    if (!started || !playing || isFinal) return;
    const f = FRAMES[frame];
    const timedMs = f.kind === "act" ? ACT_CARD_MS : f.kind === "scene" ? holdFor(SCENES[f.scene].text) : ACT_CARD_MS;
    if (voiceOn && !reduce && f.kind === "scene") {
      const lineIndex = Math.min(f.scene, PROLOGUE_LINE_IDS.length - 1);
      const id = PROLOGUE_LINE_IDS[lineIndex];
      if (!id || lastLineRef.current === id) return;
      lastLineRef.current = id;
      let cancelled = false; // a stale end (we already moved on) must not cut the new line short
      playVoiceWithEnd(id, undefined, () => {
        if (!cancelled) {
          const t = window.setTimeout(advance, 450);
          timersRef.current.push(t);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    const t = window.setTimeout(advance, timedMs);
    return () => window.clearTimeout(t);
  }, [started, playing, frame, reduce, isFinal, voiceOn, advance]);

  // page turns and act-card slams; a slowly brightening ambient bed follows the film
  useEffect(() => {
    if (!started || frame === 0) return;
    const f = FRAMES[frame];
    if (f.kind === "act") {
      sound.stampThunk();
      if (!reduce) {
        void sheetControls.start({ x: [0, -8, 7, -4, 3, -1, 0], transition: { duration: 0.45, ease: "easeOut" } });
      }
    } else sound.paperSlide();
    ambient.setIntensity(Math.min(0.5, frame * 0.05));
    if (f.kind === "finale") ambient.setPhase("over");
  }, [started, frame, reduce, sheetControls]);

  // the PLAY stamp lands once the table has sketched itself in
  useEffect(() => {
    if (!isFinal) return;
    const t = window.setTimeout(() => setSlammed(true), reduce ? 600 : 1500);
    return () => window.clearTimeout(t);
  }, [isFinal, reduce]);

  useEffect(() => {
    if (slammed) sound.stampThunk();
  }, [slammed]);

  // silence the narrator and the room when the page goes away
  useEffect(() => () => stopVoice(), []);
  useEffect(() => () => ambient.stop(), []);

  const begin = () => {
    lastLineRef.current = null;
    setStarted(true);
    sound.stampThunk();
    ambient.start();
    ambient.setPhase("mulligan");
    // warm the cache for the whole script — the first line loads before the
    // first scene starts speaking, the rest buffer in parallel
    void preloadVoices(PROLOGUE_LINE_IDS.slice(1));
  };

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setPrologueVoicePref(next);
    if (next) {
      lastLineRef.current = null; // let the narration effect replay the current line
    } else {
      stopVoice();
    }
  };

  const jumpToAct = useCallback(
    (act: number) => {
      const target = ACT_FIRST_FRAME[Math.min(act, ACT_FIRST_FRAME.length - 1)];
      if (target === frame) return;
      if (target < frame) lastLineRef.current = null; // let the jumped-to line speak again
      setPlaying(true);
      setFrame(target);
    },
    [frame],
  );

  const finish = () => {
    window.localStorage.setItem("inkduel:seenPrologue", "1");
    window.location.href = "/duel";
  };

  const skip = () => {
    window.localStorage.setItem("inkduel:seenPrologue", "1");
    window.location.href = "/";
  };

  const playDuel = () => {
    window.localStorage.setItem("inkduel:seenPrologue", "1");
    sound.stampThunk();
  };

  const current = FRAMES[Math.min(frame, FINAL_FRAME)];
  const LETTERS = GAME_NAME.split("");
  const LETTER_STEP = 0.09;
  const TITLE_AT = 0.55;

  const counterLabel =
    current.kind === "act"
      ? `act ${ACTS[current.act].numeral.toLowerCase()}`
      : current.kind === "scene"
        ? `no. ${current.scene + 1} of ${SCENES.length}`
        : "the end";

  return (
    <main
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden p-4 sm:p-6"
      onClick={() => {
        if (started && !isFinal) advance();
      }}
    >
      {/* house lights: near-black until the film begins, then the desk comes up */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "var(--color-ink)" }}
        initial={{ opacity: 1 }}
        animate={{ opacity: started ? 0 : 1 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
      {/* paper vignette frames the scene like a film cell */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(23,20,15,0.22) 100%)" }}
      />

      <div className="relative z-10 flex w-full justify-center" style={{ perspective: "1500px" }}>
        <AnimatePresence mode="wait">
          {!started ? (
            <motion.section
              key="cold"
              className="flex w-full max-w-md flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.35 } }}
            >
              <motion.div
                className="w-full"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.5, rotate: -7, y: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                transition={reduce ? { duration: 0.4 } : { delay: 0.12, duration: 0.34, ease: "easeOut" }}
              >
                <Panel deep className="relative px-6 py-8 sm:px-10" >
                  <WashiTape angle={-4} className="left-1/2 top-0 -translate-x-1/2" width={90} />
                  <InkBleed id="ink-bleed-title" play={!reduce} peak={18} />
                  <motion.div
                    className="label-type text-center text-[10px] tracking-[0.25em] text-graphite"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reduce ? 0.2 : 1.35 }}
                  >
                    THE ARCHIVE PRESENTS
                  </motion.div>
                  <h1
                    aria-label={GAME_NAME}
                    className="mt-3 text-center font-bold text-ink"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(2.8rem, 15vw, 4.75rem)",
                      lineHeight: 1,
                      filter: "url(#ink-bleed-title)",
                      textShadow: "1px 2px 0 rgba(23,20,15,0.16)",
                    }}
                  >
                    <span aria-hidden>
                      {LETTERS.map((ch, i) => (
                        <span key={i} className="relative inline-block">
                          {i === LETTERS.length - 1 && (
                            <>
                              <motion.span
                                aria-hidden
                                className="absolute inset-0"
                                style={{ color: "var(--color-red-stamp)", transform: "translate(3px, 3px)" }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.85 }}
                                transition={{ delay: reduce ? 0.2 : TITLE_AT + i * LETTER_STEP + 0.06 }}
                              >
                                {ch}
                              </motion.span>
                              {!reduce && (
                                <InkBurst className="left-1/2 top-1/2 -ml-14 -mt-14 h-28 w-28" delay={TITLE_AT + i * LETTER_STEP + 0.08} />
                              )}
                            </>
                          )}
                          <motion.span
                            className="relative inline-block"
                            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.4, rotate: i % 2 ? 10 : -10, y: -14 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                            transition={
                              reduce
                                ? { delay: i * 0.05, duration: 0.3 }
                                : { delay: TITLE_AT + i * LETTER_STEP, type: "spring", stiffness: 420, damping: 20 }
                            }
                          >
                            {ch}
                          </motion.span>
                        </span>
                      ))}
                    </span>
                  </h1>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0.3 : 1.55 }}>
                    <HandNote className="mt-4 block text-center text-xl leading-snug sm:text-2xl">
                      a hand-drawn intro, narrated. choose your reader — or watch in silence.
                    </HandNote>
                  </motion.div>
                  <motion.div
                    className="mt-6 flex flex-col items-center gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reduce ? 0.4 : 1.75 }}
                  >
                    <StampButton size="lg" onClick={begin}>
                      BEGIN
                    </StampButton>
                    <StampButton size="sm" onClick={toggleVoice}>
                      {voiceOn ? "Voice: On" : "Voice: Off"}
                    </StampButton>
                  </motion.div>
                  <motion.p
                    className="label-type mt-5 text-center text-[9px] text-graphite"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reduce ? 0.5 : 1.9 }}
                  >
                    narration streams from the network — offline it stays silent
                  </motion.p>
                </Panel>
              </motion.div>
            </motion.section>
          ) : !isFinal ? (
            <motion.section
              key={frame}
              className="relative flex w-full max-w-3xl flex-col items-center gap-3 sm:gap-4"
              style={{ transformOrigin: "left center" }}
              {...turnProps(reduce)}
            >
              {(() => {
                const f = FRAMES[frame];
                const isAct = f.kind === "act";
                const sceneIdx = f.kind === "scene" ? f.scene : 0;
                const scene = SCENES[sceneIdx];
                const Art = scene.Art;
                const artFilter = `ink-bleed-art-${frame}`;
                const headFilter = `ink-bleed-head-${frame}`;
                return (
                  <>
                    <motion.div
                      className="ink-frame relative w-full"
                      style={{ boxShadow: "0 24px 48px -22px rgba(23,20,15,0.5)", rotate: frame % 2 ? "0.35deg" : "-0.35deg" }}
                      animate={sheetControls}
                    >
                      <WashiTape angle={frame % 2 ? 3 : -3} className="left-1/2 top-0 -translate-x-1/2" width={84} />
                      {isAct ? (
                        <InkBleed id={headFilter} play={!reduce} peak={12} seed={frame} />
                      ) : (
                        <InkBleed id={artFilter} play={!reduce} peak={9} seed={frame} />
                      )}
                      <div className="relative overflow-hidden" style={{ borderRadius: "var(--cut-a)" }}>
                        {isAct ? (
                          <div className="flex h-[34vh] w-full flex-col items-center justify-center gap-5 p-2 sm:h-[42vh] sm:p-4">
                            <motion.div
                              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.4, rotate: -14 }}
                              animate={{ opacity: 1, scale: 1, rotate: -4 }}
                              transition={reduce ? { duration: 0.4 } : { delay: 0.15, type: "spring", stiffness: 300, damping: 16 }}
                            >
                              <Stamp className="text-lg sm:text-2xl">ACT {ACTS[f.kind === "act" ? f.act : 0].numeral}</Stamp>
                            </motion.div>
                            <motion.h2
                              className="label-type text-center text-xl tracking-[0.16em] text-ink sm:text-3xl"
                              style={{ filter: `url(#${headFilter})` }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: reduce ? 0.2 : 0.55 }}
                            >
                              {ACTS[f.kind === "act" ? f.act : 0].title}
                            </motion.h2>
                            <motion.div
                              className="h-[3px] w-24 rounded-full"
                              style={{ background: "var(--color-ink)" }}
                              initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
                              animate={reduce ? { opacity: 1 } : { scaleX: 1 }}
                              transition={reduce ? { duration: 0.4 } : { delay: 0.8, duration: 0.5 }}
                            />
                          </div>
                        ) : (
                          <>
                            {/* Ken Burns: the art breathes while its line is read */}
                            <motion.div
                              className="flex h-[34vh] w-full items-center justify-center overflow-hidden p-2 sm:h-[42vh] sm:p-4"
                              style={{ filter: `url(#${artFilter})` }}
                              initial={reduce ? false : { scale: 1, x: 0 }}
                              animate={reduce ? false : { scale: 1.055, x: -10 }}
                              transition={{ duration: 12, ease: "linear" }}
                            >
                              <Art play={!reduce} />
                            </motion.div>
                            {/* vignette — the paper's edges fall away into the dark */}
                            <div
                              aria-hidden
                              className="pointer-events-none absolute inset-0"
                              style={{ background: "radial-gradient(ellipse at center, transparent 52%, rgba(23,20,15,0.16) 100%)" }}
                            />
                            {!reduce && (
                              <motion.div
                                aria-hidden
                                className="pointer-events-none absolute inset-0"
                                style={{
                                  background:
                                    "linear-gradient(105deg, rgba(23,20,15,0.45) 0%, rgba(23,20,15,0.12) 45%, transparent 65%)",
                                }}
                                initial={{ opacity: 0.55, x: "-30%" }}
                                animate={{ opacity: 0, x: "0%" }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                    {!isAct && (
                      <>
                        <InkBleed id={headFilter} play={!reduce} peak={7} seed={frame + 40} />
                        <motion.h2
                          className="label-type text-center text-sm tracking-[0.18em] text-ink sm:text-xl"
                          style={{ filter: `url(#${headFilter})` }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: reduce ? 0.2 : 0.35 }}
                        >
                          {scene.title}
                        </motion.h2>
                        <motion.p
                          className="font-hand max-w-xl text-center text-2xl leading-tight text-ink sm:text-3xl"
                          initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: "inset(-30% 100% -30% 0)" }}
                          animate={reduce ? { opacity: 1 } : { opacity: 1, clipPath: "inset(-30% -6% -30% 0)" }}
                          transition={reduce ? { delay: 0.3, duration: 0.4 } : { delay: 0.55, duration: 0.9, ease: "easeOut" }}
                        >
                          {scene.text}
                        </motion.p>
                      </>
                    )}
                    <ActChips frame={frame} onJump={jumpToAct} />
                  </>
                );
              })()}
            </motion.section>
          ) : (
            <motion.section
              key="final"
              className="relative flex w-full max-w-2xl flex-col items-center"
              style={{ transformOrigin: "left center" }}
              {...turnProps(reduce)}
            >
              <div
                className="ink-frame relative w-full px-4 pb-7 pt-8 sm:px-8"
                style={{ boxShadow: "0 24px 48px -22px rgba(23,20,15,0.5)" }}
              >
                <WashiTape angle={-4} className="left-1/2 top-0 -translate-x-1/2" width={90} />
                <InkBleed id="ink-bleed-final" play={!reduce} peak={9} seed={99} />
                <div className="h-[22vh] w-full sm:h-[27vh]" style={{ filter: "url(#ink-bleed-final)" }}>
                  <SceneFinalTable play={!reduce} />
                </div>
                <HandNote className="mt-1 block text-center text-2xl leading-tight sm:text-3xl">
                  your page is blank. pick up the pen.
                </HandNote>
                <div className="relative mt-4 flex min-h-24 w-full items-center justify-center sm:min-h-28">
                  {!slammed && (
                    <motion.span
                      className="label-type text-[11px] tracking-[0.25em] text-graphite"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: reduce ? 0.2 : 0.5 }}
                    >
                      THE FIRST DUEL AWAITS
                    </motion.span>
                  )}
                  {slammed && (
                    <>
                      {!reduce && <InkBurst className="left-1/2 top-1/2 -ml-16 -mt-16 h-32 w-32" delay={0.02} />}
                      <motion.div
                        className="relative"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 3, rotate: -18 }}
                        animate={{ opacity: 1, scale: 1, rotate: -5 }}
                        transition={reduce ? { duration: 0.4 } : { type: "spring", stiffness: 330, damping: 17 }}
                      >
                        <Link
                          href="/duel"
                          onClick={playDuel}
                          aria-label="Play — begin the first duel"
                          className="focus-ink inline-block"
                        >
                          <Stamp tone="red" className="px-8 py-4 text-4xl sm:px-14 sm:py-6 sm:text-6xl">
                            PLAY
                          </Stamp>
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
                <div
                  className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href="/campaign" className="label-type text-xs underline">
                    or scout the campaign →
                  </Link>
                  <button type="button" className="label-type text-xs text-graphite underline" onClick={finish}>
                    replay later from home
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* the corner quill writes the line number as the film runs */}
      {started && !isFinal && <QuillCounter label={counterLabel} play={playing} reduce={!!reduce} />}

      {/* controls */}
      <div
        className="fixed bottom-4 right-4 z-20 flex max-w-[58vw] flex-wrap justify-end gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {started && !isFinal && (
          <>
            <StampButton size="sm" onClick={() => { setPlaying((p) => !p); sound.pop(); }}>
              {playing ? "Pause" : "Play"}
            </StampButton>
            <StampButton size="sm" onClick={advance}>
              Next
            </StampButton>
            <StampButton size="sm" onClick={toggleVoice}>
              {voiceOn ? "Voice: On" : "Voice: Off"}
            </StampButton>
          </>
        )}
        <StampButton size="sm" onClick={skip}>
          Skip Intro
        </StampButton>
      </div>
      {started && !isFinal && (
        <p className="font-hand pointer-events-none fixed bottom-5 left-4 z-10 text-sm text-graphite sm:text-lg">
          tap anywhere to continue
        </p>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { HandNote, Panel, Stamp, StampButton, WashiTape } from "@/components/paper";
import manifest from "@/data/voice-lines.json";
import { DEFAULT_VOICE, PROLOGUE_LINE_IDS, VOICES, playVoice, readVoicePref, setVoicePref } from "@/lib/voice";

/**
 * /voices — the Voice Casting Booth. Audition the four narrators on the
 * sample line, then cast one as the game's narrator; casting writes the same
 * "inkduel:voice" preference the prologue and duels read.
 */

// prologue-1's text is the manifest sampleText, so it doubles as the audition piece
const SAMPLE_ID = PROLOGUE_LINE_IDS[0];
const LINE_TEXT = new Map(manifest.lines.map((line) => [line.id, line.text]));

export default function VoicesPage() {
  const [narrator, setNarrator] = useState<string>(DEFAULT_VOICE);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of the persisted voice preference
    setNarrator(readVoicePref());
  }, []);

  const cast = (key: string) => {
    setNarrator(key);
    setVoicePref(key);
  };

  const narratorLabel = VOICES.find((v) => v.key === narrator)?.label ?? narrator;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">AUDITION ROOM · TAKE ONE</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">Voice Casting Booth</h1>
        <HandNote className="mt-3 inline-block text-xl">
          voices stream from the network — offline, the pages simply stay silent
        </HandNote>
      </header>

      {/* the cast — one panel per narrator */}
      <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {VOICES.map((voice, i) => (
          <Panel key={voice.key} className="relative p-5" deep={i % 2 === 1}>
            <WashiTape angle={i % 2 === 0 ? -3 : 2} className="left-8 top-0" width={72} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="label-type text-[10px] text-graphite">NARRATOR · {voice.key.toUpperCase()}</div>
                <div className="small-caps mt-1 text-xl font-semibold">{voice.label}</div>
              </div>
              {narrator === voice.key && (
                <Stamp tone="red" className="text-[10px]">
                  CAST
                </Stamp>
              )}
            </div>
            <p className="font-hand mt-3 text-lg leading-snug text-graphite">
              &ldquo;{LINE_TEXT.get(SAMPLE_ID)}&rdquo;
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StampButton size="sm" onClick={() => playVoice(SAMPLE_ID, voice.key)}>
                Audition
              </StampButton>
              <button
                type="button"
                aria-pressed={narrator === voice.key}
                onClick={() => cast(voice.key)}
                className="focus-ink label-type px-3 py-1.5 text-[10px]"
                style={{
                  border: "2px solid var(--color-ink)",
                  borderRadius: "var(--cut-a)",
                  background: narrator === voice.key ? "var(--color-ink)" : "var(--color-cardstock)",
                  color: narrator === voice.key ? "var(--color-paper)" : "var(--color-ink)",
                }}
              >
                {narrator === voice.key ? "NARRATING THE GAME ✓" : "CAST AS NARRATOR"}
              </button>
            </div>
          </Panel>
        ))}
      </section>

      {/* the prologue script, read by whoever holds the narrator chair */}
      <Panel className="mt-8 p-5" deep>
        <div className="label-type text-[10px] text-graphite">
          PROLOGUE SCRIPT · READ BY {narratorLabel.toUpperCase()}
        </div>
        <ul className="mt-3 space-y-2">
          {PROLOGUE_LINE_IDS.map((id, i) => (
            <li key={id} className="flex items-center gap-3">
              <StampButton size="sm" onClick={() => playVoice(id)}>
                Line {i + 1}
              </StampButton>
              <span className="text-sm text-ink">{LINE_TEXT.get(id)}</span>
            </li>
          ))}
        </ul>
        <HandNote className="mt-3 block text-lg">files are fetched on play — the first listen may take a beat</HandNote>
      </Panel>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { HandNote, Panel, Stamp, StampButton, WashiTape } from "@/components/paper";
import { ensureGuest, getDecks, getMe, mpCreate, mpJoin, mpState, type MpDeckList } from "@/lib/api";
import { ARCHETYPE_DECKS } from "@/game/cards";

/**
 * /multiplayer — the v0 lobby. Create a duel (your active deck, open lists)
 * and share the six-letter invite code, or join a friend's duel by code.
 * Once both decks are in the duel goes active and each client routes to
 * /duel?mp=<duelId>&side=<A|B> — the lockstep duel takes it from there.
 */

const POLL_MS = 1500;

/** Pages deploys live under /inkduel — copied links must carry the basePath. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function MultiplayerPage() {
  const router = useRouter();
  const [name, setName] = useState("Scribe");
  const [deck, setDeck] = useState<MpDeckList[]>([]);
  const [deckName, setDeckName] = useState("");
  const [ready, setReady] = useState(false);

  // create flow
  const [created, setCreated] = useState<{ duelId: string; code: string } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [spectateCopied, setSpectateCopied] = useState(false);

  // join flow
  const [codeInput, setCodeInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    void (async () => {
      await ensureGuest();
      const me = await getMe();
      if (me?.name) setName(me.name);
      else if (typeof window !== "undefined" && window.localStorage.getItem("inkduel:name")) {
        setName(window.localStorage.getItem("inkduel:name")!);
      }
      const decks = await getDecks();
      const active = decks?.find((d) => d.isActive) ?? decks?.[0];
      if (active) {
        setDeck(active.cards);
        setDeckName(active.name);
      } else {
        setDeck(ARCHETYPE_DECKS.duelist.cards.map(([cardId, count]) => ({ cardId, count })));
        setDeckName("The Duelist");
      }
      setReady(true);
    })();
  }, []);

  // while a created duel waits, poll until the rival's deck lands (status active)
  useEffect(() => {
    if (!created) return;
    let live = true; // no navigation after unmount or after the duel is scrapped
    const iv = window.setInterval(() => {
      void (async () => {
        // since=-1: the lobby only reads status/decks, but the response is
        // exclusive in `since` — -1 guarantees nothing is filtered out
        const st = await mpState(created.duelId, -1);
        if (!live || !st) return;
        if (st.status === "active" && st.deckB) {
          window.clearInterval(iv);
          router.push(`/duel?mp=${created.duelId}&side=A`);
        } else if (st.status === "abandoned") {
          window.clearInterval(iv);
          setCreateError("the duel was struck from the record — open a new one");
          setCreated(null);
        }
      })();
    }, POLL_MS);
    return () => {
      live = false;
      window.clearInterval(iv);
    };
  }, [created, router]);

  const onCreate = useCallback(async () => {
    setCreateError(null);
    setCreating(true);
    const data = await mpCreate(name, deck);
    setCreating(false);
    if (!data) {
      setCreateError("the press jammed — no duel could be opened. try again.");
      return;
    }
    setCreated({ duelId: data.duelId, code: data.code });
  }, [name, deck]);

  const onCopySpectateLink = useCallback(() => {
    if (!created) return;
    const url = `${window.location.origin}${BASE_PATH}/spectate?code=${created.code}`;
    void navigator.clipboard?.writeText(url).catch(() => {});
    setSpectateCopied(true);
    window.setTimeout(() => setSpectateCopied(false), 2500);
  }, [created]);

  const onJoin = useCallback(async () => {
    const code = codeInput.trim().toUpperCase();
    if (code.length !== 6) return;
    setJoinError(null);
    setJoining(true);
    const data = await mpJoin(code, name, deck);
    setJoining(false);
    if (!data) {
      setJoinError("no duel with that code — or its table is already full");
      return;
    }
    router.push(`/duel?mp=${data.duelId}&side=B`);
  }, [codeInput, name, deck, router]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">OPEN CHANNEL · DUELS BY INVITE</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">Duel a Friend</h1>
        <HandNote className="mt-3 inline-block text-xl">
          open deck lists, honest hands — a paper night at the same table, wherever you are
        </HandNote>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* ── create a duel ── */}
        <Panel className="relative p-5">
          <WashiTape angle={-3} className="left-8 top-0" width={72} />
          <div className="label-type text-[10px] text-graphite">PANEL ONE · HOST</div>
          <h2 className="small-caps mt-1 text-2xl font-semibold">Create a Duel</h2>
          <HandNote className="mt-1 block text-lg">
            plays your active deck{deckName ? ` — “${deckName}”` : ""}
          </HandNote>

          {!created ? (
            <div className="mt-4 flex flex-col items-start gap-3">
              <StampButton onClick={() => void onCreate()} disabled={!ready || deck.length === 0 || creating}>
                {creating ? "Opening…" : "Open a Duel"}
              </StampButton>
              {createError && <HandNote className="text-lg leading-snug">{createError}</HandNote>}
              {!ready && <HandNote className="text-base">fetching your deck…</HandNote>}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-4 text-center">
              <div className="ink-frame-deep relative px-8 py-5" style={{ background: "var(--color-cardstock)" }}>
                <WashiTape angle={-2} className="left-1/2 top-0 -translate-x-1/2" width={84} />
                <div className="label-type text-[10px] text-graphite">INVITE CODE</div>
                <div
                  className="small-caps text-5xl font-bold tracking-[0.3em] md:text-6xl"
                  style={{ fontFamily: "var(--font-display)", paddingLeft: "0.3em" }}
                >
                  {created.code}
                </div>
              </div>
              <HandNote className="text-xl leading-snug">
                waiting for a rival
                <WaitingDots />
                <span className="mt-1 block text-lg">anyone with this code joins your table</span>
              </HandNote>
              <div className="label-type flex items-center gap-2 text-[10px] text-graphite">
                <span>or send spectators: /spectate?code={created.code}</span>
                <button
                  type="button"
                  className="focus-ink underline underline-offset-4"
                  onClick={onCopySpectateLink}
                  title="Copy a read-only spectator link for this duel"
                >
                  {spectateCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <button
                type="button"
                className="focus-ink label-type text-[10px] text-graphite underline underline-offset-4"
                onClick={() => {
                  setCreated(null);
                  setCreateError(null);
                }}
              >
                ✕ scrap this duel
              </button>
            </div>
          )}
        </Panel>

        {/* ── join by code ── */}
        <Panel className="relative p-5" deep>
          <WashiTape angle={2} className="right-8 top-0" width={72} />
          <div className="label-type text-[10px] text-graphite">PANEL TWO · GUEST</div>
          <h2 className="small-caps mt-1 text-2xl font-semibold">Join by Code</h2>
          <HandNote className="mt-1 block text-lg">six letters, one seat — your active deck comes with you</HandNote>

          <form
            className="mt-5 flex flex-col items-center gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onJoin();
            }}
          >
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              aria-label="Invite code"
              placeholder="······"
              autoComplete="off"
              spellCheck={false}
              className="ink-frame-thin text-center text-4xl font-bold tracking-[0.4em] focus-ink md:text-5xl"
              style={{
                fontFamily: "var(--font-display)",
                background: "var(--color-paper-deep)",
                width: "min(100%, 320px)",
                padding: "0.5rem 0 0.5rem 0.4em",
              }}
            />
            <StampButton type="submit" disabled={codeInput.length !== 6 || joining || !ready || deck.length === 0}>
              {joining ? "Joining…" : "Take a Seat"}
            </StampButton>
            {joinError && <HandNote className="text-lg leading-snug">{joinError}</HandNote>}
          </form>
        </Panel>
      </section>

      <div className="mt-10 text-center">
        <Stamp className="text-xs">V0 · OPEN LISTS — THE TAPE KEEPS EVERYONE HONEST</Stamp>
        <div className="mt-4">
          <Link href="/" className="label-type focus-ink text-xs underline underline-offset-4">
            ← back to the front page
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Gentle pulsing ellipsis for the waiting line. */
function WaitingDots() {
  return (
    <span aria-hidden className="inline-block w-8 animate-pulse text-left">
      …
    </span>
  );
}

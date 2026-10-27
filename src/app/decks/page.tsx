"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createDeck, deleteDeck, ensureGuest, getDecks, getMe, updateDeck, type DeckDto, type MeProfile } from "@/lib/api";
import { CardFace } from "@/components/card/CardFace";
import { HandNote, Panel, StampButton, WashiTape } from "@/components/paper";
import { getCard, COLLECTIBLE_CARDS } from "@/game/cards";
import { validateDeck, type DeckEntry } from "@/game/decks";
import { DECK_SIZE } from "@/config";

export default function DecksPage() {
  const [decks, setDecks] = useState<DeckDto[] | null>(null);
  const [me, setMe] = useState<MeProfile | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DeckEntry[]>([]);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    await ensureGuest();
    const [decksData, meData] = await Promise.all([getDecks(), getMe()]);
    setDecks(decksData ?? []);
    setMe(meData);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    void reload();
  }, [reload]);

  const ownedIds = useMemo(() => new Set((me?.collection ?? []).filter((c) => c.owned).map((c) => c.id)), [me]);
  const editing = decks?.find((d) => d.id === editingId) ?? null;

  const startEdit = (deck: DeckDto) => {
    setEditingId(deck.id);
    setDraft(deck.cards.map((c) => ({ ...c })));
    setDraftName(deck.name);
    setSaveError(null);
  };

  const deckCount = (list: DeckEntry[]) => list.reduce((n, c) => n + c.count, 0);

  const addCard = (cardId: string) => {
    if (!editingId) return;
    const def = getCard(cardId);
    if (!ownedIds.has(cardId)) return;
    const limit = def.rarity === "legendary" ? 1 : 2;
    const entry = draft.find((e) => e.cardId === cardId);
    if (entry && entry.count >= limit) return;
    if (deckCount(draft) >= DECK_SIZE) return;
    setSaveError(null);
    setDraft((prev) => (entry ? prev.map((e) => (e.cardId === cardId ? { ...e, count: e.count + 1 } : e)) : [...prev, { cardId, count: 1 }]));
  };

  const removeCard = (cardId: string) => {
    setDraft((prev) =>
      prev
        .map((e) => (e.cardId === cardId ? { ...e, count: e.count - 1 } : e))
        .filter((e) => e.count > 0),
    );
  };

  const errors = useMemo(() => validateDeck(draft, ownedIds), [draft, ownedIds]);

  const save = async (activate = false) => {
    if (!editingId) return;
    setSaving(true);
    setSaveError(null);
    const updated = await updateDeck(editingId, {
      name: draftName || "Untitled Deck",
      cards: draft,
      isActive: activate || undefined,
    });
    setSaving(false);
    if (updated) {
      setEditingId(null);
      await reload();
    } else {
      setSaveError("The ink smudged — check the deck and try again.");
    }
  };

  const setActive = async (id: string) => {
    await updateDeck(id, { isActive: true });
    await reload();
  };

  const remove = async (id: string) => {
    await deleteDeck(id);
    if (editingId === id) setEditingId(null);
    await reload();
  };

  const createDeckFromActive = async () => {
    // new folios clone the active deck (always a legal 20) so the builder opens valid
    const source = decks?.find((d) => d.isActive) ?? decks?.[0];
    if (!source) return;
    const deck = await createDeck("New Folio", source.cards);
    if (deck) {
      await reload();
      startEdit(deck);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">FOLD YOUR STRATEGY</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">Deck Workshop</h1>
      </header>

      {decks === null ? (
        <p className="label-type mt-10 animate-pulse text-center text-sm text-graphite">Unfolding the folios…</p>
      ) : (
        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {decks.map((d) => (
            <Panel key={d.id} className="relative flex flex-col gap-3 p-5">
              {d.isActive && <WashiTape angle={-4} className="left-1/2 top-0 -translate-x-1/2" width={86} />}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="small-caps text-xl font-bold leading-tight">{d.name}</h2>
                  <div className="label-type mt-1 text-[10px] text-graphite">
                    {deckCount(d.cards)}/{DECK_SIZE} cards {d.isActive && "· ACTIVE"}
                  </div>
                </div>
              </div>
              <DeckCurve cards={d.cards} />
              <div className="mt-auto flex flex-wrap gap-2">
                <StampButton size="sm" onClick={() => startEdit(d)}>
                  Edit
                </StampButton>
                {!d.isActive && (
                  <StampButton size="sm" onClick={() => setActive(d.id)}>
                    Set Active
                  </StampButton>
                )}
                <StampButton size="sm" onClick={() => remove(d.id)}>
                  Delete
                </StampButton>
              </div>
            </Panel>
          ))}
          <button
            type="button"
            onClick={createDeckFromActive}
            className="focus-ink flex min-h-44 flex-col items-center justify-center gap-2"
            style={{ border: "2px dashed var(--color-pencil)", borderRadius: "12px 9px 13px 8px / 9px 12px 8px 13px" }}
          >
            <span className="font-hand text-2xl text-graphite">+ start a new folio</span>
            <span className="label-type text-[10px] text-pencil">3 CUSTOM DECKS UNLOCK THE LIBRARIAN</span>
          </button>
        </section>
      )}

      {/* ── builder ── */}
      {editing && (
        <Panel className="mt-10 p-6" deep>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              aria-label="Deck name"
              className="ink-frame-thin px-3 py-1.5 text-lg"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, background: "var(--color-cardstock)" }}
            />
            <span className="label-type text-xs" style={{ color: deckCount(draft) === DECK_SIZE ? "var(--color-ink)" : "var(--color-red-stamp)" }}>
              {deckCount(draft)}/{DECK_SIZE}
            </span>
            <div className="ml-auto flex gap-2">
              <StampButton size="sm" onClick={() => setEditingId(null)}>
                Cancel
              </StampButton>
              <StampButton size="sm" disabled={saving || errors.length > 0} onClick={() => save(false)}>
                Save
              </StampButton>
              <StampButton size="sm" disabled={saving || errors.length > 0} onClick={() => save(true)}>
                Save + Active
              </StampButton>
            </div>
          </div>

          {/* handwritten validation errors */}
          {errors.length > 0 && (
            <div className="mt-3">
              {errors.map((e, i) => (
                <HandNote key={i} className="mr-4 inline-block text-xl" >
                  ✎ {e}
                </HandNote>
              ))}
            </div>
          )}
          {saveError && <HandNote className="mt-3 inline-block text-xl">✎ {saveError}</HandNote>}

          {/* deck strip: 20 slots */}
          <div className="mt-5 flex flex-wrap gap-2" onDragOver={(e) => e.preventDefault()}>
            {Array.from({ length: DECK_SIZE }).map((_, i) => {
              const flat: string[] = [];
              for (const e of draft) for (let k = 0; k < e.count; k++) flat.push(e.cardId);
              const cardId = flat[i];
              const def = cardId ? getCard(cardId) : null;
              return (
                <div
                  key={i}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/card-id");
                    if (id) addCard(id);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className="relative"
                  style={{ width: 86 }}
                >
                  {def ? (
                    <button type="button" onClick={() => removeCard(def.id)} className="focus-ink block" aria-label={`Remove ${def.name}`} title="Click to remove">
                      <CardFace card={def} size="token" />
                    </button>
                  ) : (
                    <div
                      aria-hidden
                      className="flex items-center justify-center"
                      style={{
                        width: 86,
                        aspectRatio: "5 / 7",
                        border: "1.5px dashed var(--color-pencil)",
                        borderRadius: "6px 4px 7px 5px / 5px 7px 4px 6px",
                        color: "var(--color-pencil)",
                        fontFamily: "var(--font-type)",
                        fontSize: 10,
                      }}
                    >
                      {i + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* collection panel */}
          <div className="mt-6">
            <div className="label-type mb-2 text-xs text-graphite">COLLECTION — DRAG OR CLICK TO ADD</div>
            <div className="flex max-h-80 flex-wrap gap-2 overflow-y-auto p-2" style={{ background: "var(--color-paper)", borderRadius: 8 }}>
              {COLLECTIBLE_CARDS.map((c) => {
                const inDeck = draft.find((e) => e.cardId === c.id)?.count ?? 0;
                const limit = c.rarity === "legendary" ? 1 : 2;
                const locked = !ownedIds.has(c.id);
                return (
                  <motion.button
                    key={c.id}
                    type="button"
                    draggable={!locked}
                    onDragStart={(e) => {
                      const ev = e as unknown as DragEvent;
                      ev.dataTransfer?.setData("text/card-id", c.id);
                    }}
                    onClick={() => addCard(c.id)}
                    disabled={locked || inDeck >= limit}
                    className="focus-ink relative disabled:cursor-not-allowed"
                    aria-label={`Add ${c.name}`}
                    whileHover={!locked ? { y: -4 } : undefined}
                  >
                    <CardFace card={c} size="token" locked={locked} count={inDeck > 0 ? inDeck : undefined} />
                  </motion.button>
                );
              })}
            </div>
          </div>
        </Panel>
      )}

      <p className="label-type mt-10 text-center text-[10px] text-graphite">
        The ACTIVE deck is the one that walks into the arena — <Link href="/duel" className="underline">play it</Link>
      </p>
    </main>
  );
}

/** Live hand-drawn mana-curve bar chart. */
function DeckCurve({ cards }: { cards: DeckEntry[] }) {
  const curve = useMemo(() => {
    const counts = Array.from({ length: 8 }, () => 0);
    for (const e of cards) {
      const def = getCard(e.cardId);
      const bucket = Math.min(def.cost, 7);
      counts[bucket] += e.count;
    }
    return counts;
  }, [cards]);
  const max = Math.max(1, ...curve);
  const label = (i: number) => (i === 7 ? "7+" : String(i));
  return (
    <div className="flex h-24 items-end gap-1.5" aria-label="Mana curve">
      {curve.map((n, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full"
            style={{
              height: `${(n / max) * 72}px`,
              minHeight: n > 0 ? 6 : 0,
              background: n > 0 ? "var(--color-ink)" : "transparent",
              border: n > 0 ? "none" : "1px dashed var(--color-pencil)",
              borderRadius: "3px 5px 2px 4px / 4px 2px 5px 3px",
            }}
          />
          <span className="label-type text-[8px] text-graphite">{label(i)}</span>
        </div>
      ))}
    </div>
  );
}

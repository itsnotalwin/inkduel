"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ensureGuest, getMe, craftCard, type MeProfile } from "@/lib/api";
import { CardFace } from "@/components/card/CardFace";
import { HandNote, Panel, StampButton, WashiTape } from "@/components/paper";
import { ARCHIVE_SET_IDS, KEYWORD_LABEL, getCard, type CardDef, type Keyword } from "@/game/cards";
import { CRAFT_COST, ZERO_SLIPS, type Slips } from "@/game/packs";

type TypeFilter = "all" | "unit" | "spell";
type RarityFilter = "all" | "common" | "rare" | "epic" | "legendary";
type KeywordFilter = "all" | Keyword;
type OwnedFilter = "all" | "owned" | "locked";

export default function CollectionPage() {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [type, setType] = useState<TypeFilter>("all");
  const [rarity, setRarity] = useState<RarityFilter>("all");
  const [keyword, setKeyword] = useState<KeywordFilter>("all");
  const [ownedFilter, setOwnedFilter] = useState<OwnedFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CardDef | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureGuest();
      setMe(await getMe());
    })();
  }, []);

  const ownedIds = useMemo(() => new Set((me?.collection ?? []).filter((c) => c.owned).map((c) => c.id)), [me]);

  const cards = useMemo(() => {
    const all = (me?.collection ?? []).map((c) => getCard(c.id));
    return all.filter((c) => {
      if (type !== "all" && c.type !== type) return false;
      if (rarity !== "all" && c.rarity !== rarity) return false;
      if (keyword !== "all" && !(c.keywords ?? []).includes(keyword)) return false;
      if (ownedFilter === "owned" && !ownedIds.has(c.id)) return false;
      if (ownedFilter === "locked" && ownedIds.has(c.id)) return false;
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [me, type, rarity, keyword, ownedFilter, query, ownedIds]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">EVERY CARD, DRAWN BY HAND</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">The Collection</h1>
      </header>

      {/* filters */}
      <Panel className="mt-6 flex flex-wrap items-center gap-3 p-3" deep>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search by name…"
          aria-label="Search cards"
          className="ink-frame-thin px-3 py-1.5 text-sm"
          style={{ fontFamily: "var(--font-type)", background: "var(--color-cardstock)" }}
        />
        <FilterSelect value={type} onChange={setType} options={[["all", "all types"], ["unit", "units"], ["spell", "spells"]]} label="Type" />
        <FilterSelect value={rarity} onChange={setRarity} options={[["all", "all rarities"], ["common", "common"], ["rare", "rare"], ["epic", "epic"], ["legendary", "legendary"]]} label="Rarity" />
        <FilterSelect
          value={keyword}
          onChange={setKeyword}
          options={[
            ["all", "all keywords"],
            ...Object.entries(KEYWORD_LABEL).map(([k, v]) => [k, v.toLowerCase()] as [KeywordFilter, string]),
          ]}
          label="Keyword"
        />
        <FilterSelect value={ownedFilter} onChange={setOwnedFilter} options={[["all", "everything"], ["owned", "owned"], ["locked", "locked"]]} label="Owned" />
        <SlipsChip slips={me?.slips ?? ZERO_SLIPS} />
        <span className="label-type ml-auto text-[10px] text-graphite">
          {cards.length} shown
        </span>
      </Panel>

      {/* grid */}
      {me === null ? (
        <p className="label-type mt-10 animate-pulse text-center text-sm text-graphite">Opening the archive…</p>
      ) : (
        <div className="mt-8 flex flex-wrap justify-center gap-5">
          {cards.map((c) => (
            <motion.button
              key={c.id}
              type="button"
              layout
              whileHover={{ y: -6 }}
              onClick={() => setSelected(c)}
              className="focus-ink"
              aria-label={`View ${c.name}`}
            >
              <CardFace card={c} size="collection" locked={!ownedIds.has(c.id)} />
            </motion.button>
          ))}
          {cards.length === 0 && (
            <HandNote className="text-2xl">nothing in the drawer matches — loosen a filter</HandNote>
          )}
        </div>
      )}

      {/* detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="modal"
            className="fixed inset-0 z-50 flex items-center justify-center gap-8 p-6"
            style={{ background: "rgba(244,241,234,0.93)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.85, rotate: -4, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-4 md:flex-row md:gap-10"
            >
              <div className="relative">
                <CardFace card={selected} size="hand" locked={!ownedIds.has(selected.id)} />
                {!ownedIds.has(selected.id) && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rotate-2 whitespace-nowrap px-3 py-1"
                    style={{ background: "var(--color-paper-deep)", border: "1px solid var(--color-pencil)" }}>
                    <HandNote className="text-base">locked — see the hint below</HandNote>
                  </div>
                )}
              </div>
              <Panel className="relative w-80 max-w-[85vw] p-5">
                <WashiTape angle={-3} className="left-1/2 top-0 -translate-x-1/2" width={72} />
                <h2 className="small-caps text-2xl font-bold">{selected.name}</h2>
                <div className="label-type mt-1 text-[10px] text-graphite">
                  {selected.type.toUpperCase()} · COST {selected.cost} · {selected.rarity.toUpperCase()}
                </div>
                <p className="mt-3 text-[15px] leading-snug">{selected.text || "No special abilities — honest cardstock."}</p>
                <HandNote className="mt-3 block text-xl leading-tight">“{selected.lore}”</HandNote>
                {!ownedIds.has(selected.id) ? (
                  <CraftHint
                    card={selected}
                    slips={me?.slips ?? ZERO_SLIPS}
                    onCrafted={(after) => {
                      setMe((cur) => (cur ? { ...cur, slips: after, collection: cur.collection.map((c) => (c.id === selected.id ? { ...c, owned: true } : c)) } : cur));
                    }}
                  />
                ) : null}
                <div className="mt-4 flex justify-end">
                  <StampButton size="sm" onClick={() => setSelected(null)}>
                    Close
                  </StampButton>
                </div>
              </Panel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function SlipsChip({ slips }: { slips: Slips }) {
  const total = slips.common + slips.rare + slips.epic + slips.legendary;
  return (
    <span
      className="label-type px-2 py-1 text-[9px]"
      style={{ border: "1.5px solid var(--color-pencil)", borderRadius: "5px 3px 6px 4px / 4px 6px 3px 5px" }}
      title="Duplicate slips per rarity — spend them to craft locked cards"
    >
      ♻ SLIPS · C {slips.common} · R {slips.rare} · E {slips.epic} · L {slips.legendary} {total === 0 && "(from pack duplicates)"}
    </span>
  );
}

function CraftHint({
  card,
  slips,
  onCrafted,
}: {
  card: CardDef;
  slips: Slips;
  onCrafted: (after: Slips) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const have = slips[card.rarity];
  const need = CRAFT_COST[card.rarity];
  const affordable = have >= need;

  const craft = async () => {
    setBusy(true);
    setError(null);
    const after = await craftCard(card.id);
    setBusy(false);
    if (after) onCrafted(after);
    else setError("the archivist declined — check your slips");
  };

  return (
    <div className="mt-2">
      <div className="label-type text-[10px] text-graphite">
        ♻ INK RECYCLING — CRAFT WITH DUPLICATE SLIPS ({card.rarity.toUpperCase()})
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-2.5 flex-1 overflow-hidden" style={{ border: "1px solid var(--color-pencil)", borderRadius: 4 }}>
          <div
            style={{
              width: `${Math.min(100, (have / need) * 100)}%`,
              height: "100%",
              background: "var(--color-ink)",
            }}
          />
        </div>
        <span className="label-type text-[10px]" style={{ color: affordable ? "var(--color-ink)" : "var(--color-graphite)" }}>
          {Math.min(have, need)}/{need}
        </span>
        <StampButton size="sm" disabled={!affordable || busy} onClick={() => void craft()}>
          {busy ? "…" : "Craft"}
        </StampButton>
      </div>
      {error && <HandNote className="mt-1 block text-base">✎ {error}</HandNote>}
      {!affordable && !error && <LockHint cardId={card.id} />}
    </div>
  );
}

function LockHint({ cardId }: { cardId: string }) {
  const hints: Record<string, string> = {
    the_living_manuscript: "Win 3 matches in a row (Hattrick in Ink).",
    the_unwritten: "Deal 12+ damage in one turn (Red Ink).",
    the_archivist: "Win a match in 8 turns or fewer (First Draft).",
    the_grand_palimpsest: "Reach Gold rank (Gold Standard).",
  };
  if (ARCHIVE_SET_IDS.has(cardId)) {
    return (
      <HandNote className="mt-2 block text-lg">
        unlock: tear it from a pack in the Ink Vault, clear the campaign — or craft it from duplicate slips
      </HandNote>
    );
  }
  return <HandNote className="mt-2 block text-lg">unlock: {hints[cardId] ?? "an achievement"}</HandNote>;
}

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="label-type text-[9px] text-graphite">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="ink-frame-thin px-2 py-1 text-xs"
        style={{ fontFamily: "var(--font-type)", background: "var(--color-cardstock)" }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

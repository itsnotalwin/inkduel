const base = "http://localhost:3000";
let cookie = "";
async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  const j = await res.json();
  return { status: res.status, body: j };
}
(async () => {
  const guest = await call("POST", "/api/auth/guest", { name: "TestScribe" });
  console.log("guest:", guest.status, JSON.stringify(guest.body.data?.name));
  const me = await call("GET", "/api/me");
  console.log("me:", me.status, "mmr", me.body.data?.mmr, "collection", me.body.data?.collection?.length, "achievements", me.body.data?.achievements?.length);
  const decks = await call("GET", "/api/decks");
  console.log("decks:", decks.status, decks.body.data?.length, "|", decks.body.data?.map((d) => d.name).join(" | "));
  const active = decks.body.data.find((d) => d.isActive);
  const m = await call("POST", "/api/matches", {
    opponentKey: "duelist",
    result: "WIN",
    turns: 6,
    playerHpLeft: 12,
    botHpLeft: 0,
    seed: 12345,
    durationMs: 240000,
    deckUsed: active.cards,
    maxTurnDamage: 7,
    maxTurnKills: 2,
    tookFatigue: false,
    actionLog: [{ turn: 0, side: "sys", text: "The duel begins." }],
  });
  console.log("match:", m.status, JSON.stringify(m.body.data));
  const q = await call("GET", "/api/quests/today");
  console.log("quest:", q.status, JSON.stringify(q.body.data));
  const lb = await call("GET", "/api/leaderboard");
  console.log("leaderboard:", lb.status, "rows", lb.body.data?.rows?.length, "own", JSON.stringify(lb.body.data?.ownRow));
  const hist = await call("GET", "/api/matches?page=1");
  console.log("history:", hist.status, "total", hist.body.data?.total);
  const badDeck = await call("POST", "/api/decks", { name: "Bad", cards: [{ cardId: "ink_blot", count: 21 }] });
  console.log("bad deck (expect 422):", badDeck.status, String(badDeck.body.error).slice(0, 60));
  const meta = await call("GET", "/api/analytics/meta");
  console.log("meta:", meta.status, "totalMatches", meta.body.data?.totalMatches, "topPlayed", meta.body.data?.topPlayed?.[0]?.name);
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});

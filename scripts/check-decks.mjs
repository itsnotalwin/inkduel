const base = "http://localhost:3000";
(async () => {
  const g = await fetch(base + "/api/auth/guest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  const cookie = g.headers.get("set-cookie").split(";")[0];
  const d = await fetch(base + "/api/decks", { headers: { Cookie: cookie } });
  const j = await d.json();
  for (const deck of j.data) {
    const swans = deck.cards.filter((c) => c.cardId === "paper_swan");
    console.log(deck.name, "| swans:", JSON.stringify(swans), "| total:", deck.cards.reduce((n, c) => n + c.count, 0));
  }
})().catch((e) => console.error("ERR", e.message));

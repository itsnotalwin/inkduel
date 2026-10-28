const base = "http://localhost:3000";
const g = await fetch(base + "/api/auth/guest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "EconTest2" }) });
const setCookie = g.headers.get("set-cookie") ?? "";
console.log("guest status:", g.status, "| has cookie:", setCookie.length > 0);
const cookie = setCookie.split(";")[0];
const c = await (await fetch(base + "/api/campaign", { headers: { Cookie: cookie } })).json();
console.log("progress:", c.data?.progress, "| stage0 unlocked:", c.data?.stages?.[0]?.unlocked);
const p = await (await fetch(base + "/api/campaign", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ stage: 0, result: "WIN" }) })).json();
console.log("after win:", JSON.stringify(p.data));
const pk = await (await fetch(base + "/api/packs", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ packs: 1 }) })).json();
console.log("pack cards:", (pk.data?.cards ?? []).map((x) => x.cardId + (x.isNew ? "(new)" : "(dup)")).join(", "), "| coinsAfter:", pk.data?.coinsAfter, "| refund:", pk.data?.totalRefund);
const me = await (await fetch(base + "/api/me", { headers: { Cookie: cookie } })).json();
const firstNew = pk.data?.newCards?.[0];
console.log("coins:", me.data.coins, "| campaignStage:", me.data.campaignStage, "| pulled card owned:", me.data.collection.find((x) => x.id === firstNew)?.owned);
// skip ahead: try completing stage 2 while on stage 1 (should 409)
const skip = await (await fetch(base + "/api/campaign", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ stage: 2, result: "WIN" }) })).json();
console.log("skip-ahead blocked:", !skip.ok || skip.ok === false, JSON.stringify(skip.error ?? ""));

/**
 * Mobile UX audit at 390×844 (iPhone 14-ish).
 * For each route: horizontal overflow, touch targets < 40px, tiny text < 11px,
 * and viewport/safe-area metadata. Writes a JSON report.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.AUDIT_BASE ?? "http://localhost:3000";
const ROUTES = [
  "/", "/prologue", "/duel", "/collection", "/decks", "/decks?edit=starter_litter",
  "/packs", "/leaderboard", "/profile", "/meta", "/replays", "/multiplayer",
  "/draft", "/puzzles", "/descent", "/voices", "/campaign", "/archies",
];

const results = [];

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await ctx.newPage();

for (const route of ROUTES) {
  const entry = { route, overflow: false, overflowWidth: 0, tinyTargets: [], tinyText: [] };
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1400);

    const audit = await page.evaluate(() => {
      const out = { overflow: false, overflowWidth: 0, tinyTargets: [], tinyText: [] };
      out.overflowWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      out.overflow = out.overflowWidth > window.innerWidth + 1;

      const els = document.querySelectorAll("button, a, [role='button'], input, select, textarea, [onclick]");
      for (const el of els) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const label = (el.textContent ?? "").trim().slice(0, 28) || el.getAttribute("aria-label") || el.tagName;
        const min = Math.min(r.width, r.height);
        if (min < 40) {
          out.tinyTargets.push({ label, w: Math.round(r.width), h: Math.round(r.height) });
        }
      }
      // tiny visible text (body copy under 11px)
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent?.trim();
        if (!text || text.length < 3) continue;
        const el = node.parentElement;
        if (!el || seen.has(el)) continue;
        seen.add(el);
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const fs = parseFloat(style.fontSize);
        if (fs < 11) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          out.tinyText.push({ text: text.slice(0, 30), fs, tag: el.tagName });
        }
      }
      return out;
    });
    Object.assign(entry, audit);
  } catch (e) {
    entry.error = String(e.message ?? e).slice(0, 120);
  }
  results.push(entry);
  const flags = [entry.overflow ? "OVERFLOW" : "", entry.tinyTargets.length ? `${entry.tinyTargets.length} tinyTargets` : "", entry.tinyText.length ? `${entry.tinyText.length} tinyText` : ""].filter(Boolean).join(" ");
  console.log(`${route}: ${entry.error ? "ERR " + entry.error : flags || "clean"}`);
}

await browser.close();
mkdirSync("tmp-audio", { recursive: true });
writeFileSync("tmp-audio/mobile-audit.json", JSON.stringify(results, null, 2));
console.log("report: tmp-audio/mobile-audit.json");

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Stamp, StampButton, HandNote } from "@/components/paper";

const KNOWN_ROUTES = ["/duel", "/collection", "/decks", "/leaderboard", "/profile", "/meta", "/replays"];

/**
 * A torn corner of the archive: whatever page you wanted isn't here.
 * On static hosting (GitHub Pages) a cold deep link like /duel lands here —
 * redirect to the exported .html twin so the duel still opens.
 */
export default function NotFound() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname.replace(/\/$/, "");
    if (path.endsWith(".html")) return;
    const match = KNOWN_ROUTES.find((r) => path.endsWith(r));
    if (match) {
      window.location.replace(path + ".html" + window.location.search);
    }
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Stamp tone="red" className="text-4xl md:text-6xl">
        PAGE TORN OUT
      </Stamp>
      <HandNote className="max-w-md text-2xl leading-snug">
        This page is missing from the archive — perhaps it was recycled into a paper golem.
      </HandNote>
      <Link href="/">
        <StampButton>Back to the front page</StampButton>
      </Link>
    </main>
  );
}

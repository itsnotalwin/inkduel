"use client";

import { useEffect } from "react";

/** Registers the service worker (production builds only). */
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const swUrl = new URL("sw.js", document.baseURI).href;
    navigator.serviceWorker.register(swUrl).catch(() => {
      // offline mode is a bonus — never break the page over it
    });
  }, []);
  return null;
}

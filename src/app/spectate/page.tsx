import { Suspense } from "react";
import SpectateClient from "./SpectateClient";

export const metadata = { title: "Spectate" };

export default function SpectatePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <p className="label-type animate-pulse text-sm text-graphite">Finding your seat in the gallery…</p>
        </main>
      }
    >
      <SpectateClient />
    </Suspense>
  );
}

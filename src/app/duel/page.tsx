import { Suspense } from "react";
import DuelClient from "@/components/duel/DuelClient";

export const metadata = { title: "Duel" };

export default function DuelPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <p className="label-type animate-pulse text-sm text-graphite">Preparing the duel…</p>
        </main>
      }
    >
      <DuelClient />
    </Suspense>
  );
}

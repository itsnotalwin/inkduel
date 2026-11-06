import { Suspense } from "react";
import dynamic from "next/dynamic";

/** The duel client is the heaviest component (engine + AI + anim drain) —
 *  lazy-loaded so other pages never pay its JS cost. */
const DuelClient = dynamic(() => import("@/components/duel/DuelClient"), {
  loading: () => (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="label-type animate-pulse text-sm text-graphite">Preparing the duel…</p>
    </main>
  ),
});

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

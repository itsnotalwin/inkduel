"use client";

import Link from "next/link";
import { Stamp, StampButton, HandNote } from "@/components/paper";

/** A torn corner of the archive: whatever page you wanted isn't here. */
export default function NotFound() {
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

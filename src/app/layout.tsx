import type { Metadata } from "next";
import { Caveat, EB_Garamond, Special_Elite } from "next/font/google";
import { PaperGrain } from "@/components/paper";
import { GAME_NAME, GAME_TAGLINE } from "@/config";
import "./globals.css";

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const elite = Special_Elite({
  variable: "--font-special-elite",
  subsets: ["latin"],
  weight: "400",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${GAME_NAME} — ${GAME_TAGLINE}`,
    template: `%s — ${GAME_NAME}`,
  },
  description:
    "A monochrome paper-style card battler. Duel ink-drawn opponents, climb the ranked ladder and read the Daily Ink.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${garamond.variable} ${elite.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PaperGrain />
        {children}
      </body>
    </html>
  );
}

import { ArtCanvas, Hatch, Ink, PAPER, Sketch, Splotch } from "./helpers";

export const TheLivingManuscript = () => (
  <ArtCanvas label="The Living Manuscript" bg={PAPER}>
    <Ink fill="var(--color-paper)">
      {/* open book */}
      <path d="M50 44 C38 38 24 38 12 42 L12 20 C24 16 38 16 50 22 C62 16 76 16 88 20 L88 42 C76 38 62 38 50 44 Z" />
      <path d="M50 22 L50 44" />
    </Ink>
    {/* spectral script rising */}
    <Ink width={1.8}>
      <path d="M30 12 C34 8 38 12 42 8 M52 10 C56 6 60 10 64 6" opacity="0.8" />
      <path d="M26 16 C32 12 36 16 40 13 M56 14 C62 10 68 14 72 11" opacity="0.5" />
      <path d="M44 4 C46 2 50 2 52 4" opacity="0.9" />
    </Ink>
    <Sketch>
      <path d="M18 26 C28 23 40 24 46 27 M54 27 C62 24 74 23 82 26" />
      <path d="M20 32 C30 29 40 30 46 33 M54 33 C62 30 72 29 80 32" />
      <path d="M22 38 C30 35 40 36 46 39 M54 39 C62 36 70 35 78 38" />
    </Sketch>
    <Splotch cx={50} cy={6} r={1.6} opacity={0.8} />
  </ArtCanvas>
);

export const TheGrandPalimpsest = () => (
  <ArtCanvas label="The Grand Palimpsest" bg="var(--color-paper-deep)">
    {/* back torn layers */}
    <Ink width={2.2} fill="var(--color-paper-deep)">
      <path d="M14 50 L16 14 L34 10 L52 14 L70 10 L86 16 L84 50 Z" />
    </Ink>
    <Ink width={2.2} fill="var(--color-paper)">
      <path d="M20 52 L22 20 L40 16 L58 20 L76 16 L80 22 L78 52 Z" />
    </Ink>
    {/* top torn sheet */}
    <Ink fill="var(--color-paper)">
      <path d="M26 54 L28 26 Q44 20 60 24 L72 22 L74 28 L72 54 Z" />
    </Ink>
    {/* ghost handwriting between the layers */}
    <Sketch>
      <path d="M32 32 C40 28 48 34 58 29 M32 40 C42 36 50 42 62 37" />
      <path d="M34 46 C42 43 52 47 64 44" strokeDasharray="3 2" />
    </Sketch>
    <Ink width={1.8}>
      <path d="M34 30 C40 27 46 31 54 28" opacity="0.9" />
      <path d="M34 37 C44 33 52 39 66 34" opacity="0.6" />
    </Ink>
    <Hatch x={66} y={30} angle={45} length={10} count={4} width={1.2} />
  </ArtCanvas>
);

export const TheArchivist = () => (
  <ArtCanvas label="The Archivist" bg={PAPER}>
    <Ink fill="var(--color-paper)">
      {/* hooded figure */}
      <path d="M50 8 C60 8 66 16 66 26 L66 54 L34 54 L34 26 C34 16 40 8 50 8 Z" />
      {/* shadowed face */}
      <path d="M42 24 C44 30 56 30 58 24 C56 18 44 18 42 24 Z" fill="var(--color-ink)" />
    </Ink>
    <Ink width={2.2} fill="var(--color-paper-deep)">
      {/* archive card drawers flanking */}
      <rect x="8" y="34" width="18" height="14" />
      <rect x="74" y="34" width="18" height="14" />
    </Ink>
    <Ink width={2}>
      <path d="M13 41 L21 41 M79 41 L87 41" />
      {/* the great key */}
      <circle cx="50" cy="38" r="5" fill="none" />
      <path d="M50 43 L50 54 M46 50 L54 50 M46 54 L52 54" />
    </Ink>
    <Sketch>
      <path d="M40 44 L44 44 M56 44 L60 44 M38 50 L46 50 M54 50 L62 50" />
    </Sketch>
  </ArtCanvas>
);

export const TheUnwritten = () => (
  <ArtCanvas label="The Unwritten" bg="var(--color-paper-deep)">
    {/* radiant blank page */}
    <Ink fill={PAPER}>
      <path d="M32 52 L32 16 L52 10 L68 16 L68 52 Z" />
    </Ink>
    <Ink width={2}>
      <path d="M52 10 L52 16 L68 16" />
    </Ink>
    {/* rays of potential */}
    <Ink width={1.8}>
      <path d="M50 4 L50 0 M40 6 L37 2 M60 6 L63 2" opacity="0.7" />
      <path d="M26 22 L20 20 M74 22 L80 20" opacity="0.7" />
    </Ink>
    {/* quill poised above the emptiness */}
    <Ink width={2.2}>
      <path d="M64 34 C58 26 52 20 46 18 C48 24 52 30 60 36" fill="var(--color-paper)" />
      <path d="M60 36 L64 34" />
    </Ink>
    <Sketch>
      <path d="M38 26 L46 26 M38 32 L46 32 M38 38 L46 38" strokeDasharray="2 3" />
    </Sketch>
  </ArtCanvas>
);

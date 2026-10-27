import { ArtCanvas, GroundLine, Hatch, Ink, PAPER, Sketch, Splotch } from "./helpers";

export const TheCalligrapher = () => (
  <ArtCanvas label="The Calligrapher" bg={PAPER}>
    <Ink width={2.2} fill="var(--color-paper)">
      {/* the page being written on */}
      <path d="M14 14 L58 14 L58 52 L14 52 Z" />
    </Ink>
    <Sketch>
      <path d="M20 24 C34 20 42 30 52 24" />
      <path d="M20 32 C30 30 40 38 50 32" />
      <path d="M20 40 C28 38 36 44 46 40" />
    </Sketch>
    {/* elegant hand holding the nib */}
    <Ink fill="var(--color-paper)">
      <path d="M70 34 C74 30 80 30 82 34 C84 38 80 42 76 42 C72 42 68 40 66 36" />
      <path d="M66 36 L58 32" />
    </Ink>
    <Ink width={2.4}>
      <path d="M58 32 L46 26" />
      <path d="M46 26 L42 24 L46 30 Z" fill="var(--color-ink)" />
    </Ink>
    <Ink width={2}>
      <path d="M46 26 C40 22 36 22 32 26" />
    </Ink>
    <Splotch cx={54} cy={44} r={1.8} />
  </ArtCanvas>
);

export const ComicRelief = () => (
  <ArtCanvas label="Comic Relief" bg="var(--color-paper-deep)">
    <GroundLine />
    <Ink fill="var(--color-paper)">
      {/* jester with three-point hat */}
      <circle cx="50" cy="26" r="9" />
      <path d="M42 20 L36 8 L46 16 L50 4 L54 16 L64 8 L58 20" />
      {/* body */}
      <path d="M42 34 C38 40 38 48 42 54 L58 54 C62 48 62 40 58 34" />
    </Ink>
    <Ink width={2.4}>
      {/* two pens crossed */}
      <path d="M36 36 L26 50 M36 50 L26 36" />
      <circle cx="37.5" cy="24" r="1.3" fill="var(--color-ink)" stroke="none" />
      <path d="M44 27 Q50 31 56 27" />
      <circle cx="63" cy="24" r="1.3" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M20 14 L28 18 M80 14 L72 18" />
    </Sketch>
  </ArtCanvas>
);

export const SketchSentinel = () => (
  <ArtCanvas label="Sketch Sentinel" bg={PAPER}>
    {/* construction lines: half-finished drawing */}
    <Sketch>
      <circle cx="50" cy="22" r="10" strokeDasharray="5 3" />
      <path d="M50 32 L50 52" strokeDasharray="6 4" />
      <path d="M36 40 L64 40" strokeDasharray="6 4" />
      <path d="M44 56 L50 52 L56 56" strokeDasharray="5 3" />
      <path d="M18 10 L24 14 M82 12 L76 16" />
    </Sketch>
    {/* the inked half */}
    <Ink fill="var(--color-paper)">
      <path d="M50 12 C56 12 60 16 60 22 C60 28 56 32 50 32 L50 32 C44 32 40 28 40 22 C40 16 44 12 50 12 Z" />
      <path d="M50 32 L50 52 L44 56" />
      <path d="M50 40 L64 40 L64 54" />
    </Ink>
    <Ink width={2}>
      <circle cx="46" cy="21" r="1.5" fill="var(--color-ink)" stroke="none" />
      <circle cx="54" cy="21" r="1.5" fill="var(--color-ink)" stroke="none" />
      <path d="M46 26 L54 26" />
    </Ink>
    <Hatch x={54} y={36} angle={45} length={10} count={4} width={1.2} />
  </ArtCanvas>
);

export const PaperDragon = () => (
  <ArtCanvas label="Paper Dragon" bg={PAPER}>
    <Sketch>
      <path d="M6 44 q10 -3 20 0" />
      <path d="M8 50 q8 -2 16 0" />
    </Sketch>
    <Ink fill="var(--color-paper)">
      {/* serpentine folded body */}
      <path d="M20 40 L34 32 L44 40 L56 30 L70 38 L82 30" />
      <path d="M20 48 L36 42 L48 48 L62 40 L76 48 L86 40 L86 34 L74 42 L60 34 L46 42 L34 36 L20 46 Z" fill="var(--color-paper-deep)" />
      {/* head */}
      <path d="M82 30 L92 26 L94 32 L88 36 L82 38" />
      {/* folded wings */}
      <path d="M44 40 L50 16 L58 38 Z" />
      <path d="M34 32 L28 14 L40 30 Z" />
    </Ink>
    <Ink width={2}>
      <circle cx="88" cy="31" r="1.2" fill="var(--color-ink)" stroke="none" />
      <path d="M94 32 L98 34 L94 35" />
    </Ink>
    <Sketch>
      <path d="M40 34 L48 40 M56 32 L64 38" />
    </Sketch>
  </ArtCanvas>
);

export const OrigamiPhoenix = () => (
  <ArtCanvas label="Origami Phoenix" bg="var(--color-paper-deep)">
    <Ink fill="var(--color-paper)">
      {/* rising angular phoenix */}
      <path d="M50 52 L44 34 L28 40 L42 26 L30 12 L48 22 L54 8 L60 24 L76 14 L62 30 L72 42 L56 34 Z" />
    </Ink>
    <Sketch>
      <path d="M50 52 L48 34 M44 34 L56 34" />
      <circle cx="53" cy="26" r="1.3" fill="var(--color-ink)" stroke="none" />
    </Sketch>
    <Ink width={2.2}>
      {/* flame creases */}
      <path d="M36 54 q6 4 12 0 q6 -4 12 0" />
      <path d="M40 58 q5 3 10 0" />
    </Ink>
    <Hatch x={58} y={30} angle={45} length={9} count={3} width={1.2} />
  </ArtCanvas>
);

export const ArchivistsAide = () => (
  <ArtCanvas label="Archivist's Aide" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      {/* figure carrying a tall stack */}
      <circle cx="50" cy="30" r="6" />
      <path d="M44 54 C42 44 44 38 50 38 C56 38 58 44 56 54" />
      <path d="M44 54 L40 56 M56 54 L60 56" />
    </Ink>
    <Ink width={2.2} fill="var(--color-paper-deep)">
      {/* book stack carried overhead */}
      <rect x="34" y="18" width="32" height="6" />
      <rect x="38" y="12" width="26" height="5" />
      <rect x="42" y="7" width="20" height="4" />
    </Ink>
    <Ink width={2}>
      <path d="M44 34 L56 34" />
      <circle cx="48" cy="29" r="1.2" fill="var(--color-ink)" stroke="none" />
      <circle cx="52" cy="29" r="1.2" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M34 21 L66 21 M38 15 L62 15" />
    </Sketch>
  </ArtCanvas>
);

export const StationeryTitan = () => (
  <ArtCanvas label="Stationery Titan" bg="var(--color-paper-deep)">
    <GroundLine y={58} />
    <Ink fill="var(--color-paper)">
      {/* clipboard torso */}
      <rect x="34" y="18" width="32" height="40" rx="3" />
      <rect x="44" y="14" width="12" height="6" rx="2" />
      {/* massive stapler arm */}
      <path d="M66 24 L86 30 L84 38 L66 34" />
    </Ink>
    <Ink width={2}>
      <path d="M42 30 L58 30 M42 38 L58 38 M42 46 L52 46" />
      <circle cx="47" cy="24" r="1.4" fill="var(--color-ink)" stroke="none" />
      <circle cx="53" cy="24" r="1.4" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M38 52 L62 52" />
      <path d="M74 34 L84 36" />
    </Sketch>
    <Hatch x={58} y={34} angle={50} length={18} count={5} width={1.2} />
  </ArtCanvas>
);

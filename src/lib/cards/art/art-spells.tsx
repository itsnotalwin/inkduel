import { ArtCanvas, GroundLine, Hatch, Ink, PAPER, Sketch, Splotch } from "./helpers";

export const RedPen = () => (
  <ArtCanvas label="Red Pen" bg={PAPER}>
    <Ink fill="var(--color-paper-deep)">
      <path d="M18 46 L58 20 L66 24 L28 50 Z" />
      <path d="M58 20 L64 12 L70 16 L66 24" fill="var(--color-paper)" />
      <path d="M18 46 L14 54 L24 50" fill="var(--color-ink)" />
    </Ink>
    <Sketch>
      <path d="M60 14 L68 10" />
      <circle cx="64" cy="13" r="1.2" fill="var(--color-ink)" stroke="none" />
    </Sketch>
    <Ink width={2.4}>
      <path d="M30 12 C40 8 52 8 62 12" opacity="0.5" />
    </Ink>
    <Hatch x={22} y={34} angle={30} length={10} count={3} width={1.2} />
  </ArtCanvas>
);

export const CrumpledNote = () => (
  <ArtCanvas label="Crumpled Note" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      {/* crumpled ball: irregular polygon with crease facets */}
      <path d="M36 22 L52 16 L66 24 L70 38 L60 50 L42 52 L30 40 Z" />
    </Ink>
    <Ink width={1.8}>
      <path d="M36 22 L48 34 L30 40 M52 16 L48 34 L66 24 M48 34 L60 50 M48 34 L42 52" />
    </Ink>
    <Sketch>
      {/* angry scribbles escaping */}
      <path d="M20 18 L30 14 M16 26 L26 24 M74 16 L82 20 M78 30 L86 28" />
    </Sketch>
    <Hatch x={52} y={40} angle={-45} length={8} count={3} width={1.1} />
  </ArtCanvas>
);

export const FreshInk = () => (
  <ArtCanvas label="Fresh Ink" bg={PAPER}>
    <Ink fill="var(--color-paper)">
      {/* ink bottle */}
      <path d="M34 34 L34 26 L42 22 L42 14 L58 14 L58 22 L66 26 L66 46 C66 50 62 52 58 52 L42 52 C38 52 34 50 34 46 Z" />
      <path d="M40 22 L60 22" />
    </Ink>
    <Ink fill="var(--color-ink)">
      <path d="M38 40 C40 36 46 36 50 38 C54 40 60 38 62 42 L62 46 C62 49 59 50 56 50 L44 50 C41 50 38 49 38 46 Z" stroke="none" />
    </Ink>
    <Ink width={2.2}>
      {/* fresh drop falling in */}
      <path d="M50 6 C52 9 54 11 52 13 C50 15 47 13 48 10 C48.5 8.5 49 7 50 6 Z" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M20 18 C24 14 28 16 30 12 M72 16 C76 12 80 16 84 12" />
    </Sketch>
  </ArtCanvas>
);

export const BlankPage = () => (
  <ArtCanvas label="Blank Page" bg="var(--color-paper-deep)">
    <Ink fill={PAPER}>
      <path d="M30 52 L30 14 L54 8 L70 14 L70 52 Z" />
    </Ink>
    <Ink width={2}>
      <path d="M54 8 L54 14 L70 14" />
    </Ink>
    {/* sparkles of potential */}
    <Ink width={1.8}>
      <path d="M46 24 L50 28 M50 24 L46 28 M58 34 L62 38 M62 34 L58 38 M44 40 L46 42 M46 40 L44 42" />
    </Ink>
    <Sketch>
      <path d="M36 20 L48 20" strokeDasharray="2 3" />
      <path d="M36 28 L48 28" strokeDasharray="2 3" />
    </Sketch>
  </ArtCanvas>
);

export const SecondDraft = () => (
  <ArtCanvas label="Second Draft" bg={PAPER}>
    <Ink fill="var(--color-paper)">
      <path d="M34 50 L34 16 L56 10 L66 16 L66 50 Z" />
    </Ink>
    <Ink width={2}>
      <path d="M56 10 L56 16 L66 16" />
    </Ink>
    <Sketch>
      <path d="M40 24 L60 24 M40 30 L60 30 M40 36 L54 36" />
    </Sketch>
    {/* circular return arrow */}
    <Ink width={2.4}>
      <path d="M26 44 C18 38 20 24 30 20" fill="none" />
      <path d="M30 20 L22 20 M30 20 L27 27" />
    </Ink>
    <Ink width={1.6}>
      <path d="M40 42 L54 42" opacity="0.5" />
    </Ink>
  </ArtCanvas>
);

export const PaperCut = () => (
  <ArtCanvas label="Paper Cut" bg={PAPER}>
    {/* a sheet slicing diagonally with a razor edge */}
    <Ink fill="var(--color-paper)">
      <path d="M20 54 L58 8 L64 12 L30 56 Z" />
    </Ink>
    <Ink width={2.6}>
      <path d="M58 8 L64 12" />
    </Ink>
    {/* impact slashes */}
    <Ink width={2.2}>
      <path d="M68 24 L82 20 M70 32 L86 30 M72 40 L84 42" />
    </Ink>
    <Sketch>
      <path d="M14 20 L22 16 M12 30 L20 28" />
    </Sketch>
    <Hatch x={30} y={40} angle={35} length={9} count={3} width={1.1} />
  </ArtCanvas>
);

export const SharpenedPencil = () => (
  <ArtCanvas label="Sharpened Pencil" bg={PAPER}>
    <GroundLine y={56} />
    <Ink fill="var(--color-paper-deep)">
      <path d="M20 40 L64 22 L70 32 L26 50 Z" />
      {/* wood cone */}
      <path d="M20 40 L10 44 L14 47 L26 50" fill="var(--color-paper)" />
      {/* graphite tip */}
      <path d="M10 44 L4 46 L14 47" fill="var(--color-ink)" />
    </Ink>
    <Sketch>
      <path d="M30 42 L62 30" />
      {/* shavings */}
      <path d="M68 46 q8 6 16 0 q-4 8 -12 6 q-5 -1 -4 -6 Z" />
    </Sketch>
    <Hatch x={54} y={34} angle={40} length={9} count={3} width={1.1} />
  </ArtCanvas>
);

export const Lamination = () => (
  <ArtCanvas label="Lamination" bg="var(--color-paper-deep)">
    <Ink fill={PAPER}>
      <path d="M26 50 L26 16 L52 10 L68 16 L68 50 Z" />
    </Ink>
    <Ink width={2}>
      <path d="M52 10 L52 16 L68 16" />
    </Ink>
    {/* glossy sleeve over it */}
    <Ink width={2.4}>
      <rect x="20" y="8" width="56" height="46" rx="4" fill="none" opacity="0.9" />
      {/* shine lines */}
      <path d="M28 14 L40 10 M26 24 L46 14" opacity="0.7" />
    </Ink>
    <Sketch>
      <path d="M34 26 L60 26 M34 34 L60 34 M34 42 L52 42" />
    </Sketch>
  </ArtCanvas>
);

export const PressureStamp = () => (
  <ArtCanvas label="Pressure Stamp" bg={PAPER}>
    {/* stamp handle pressing down */}
    <Ink fill="var(--color-paper-deep)">
      <path d="M40 6 L60 6 L60 16 L40 16 Z" />
      <path d="M36 16 L64 16 L64 26 L36 26 Z" />
      <path d="M30 26 L70 26 L70 34 L30 34 Z" />
    </Ink>
    {/* impact lines */}
    <Ink width={2.2}>
      <path d="M20 38 L14 44 M80 38 L86 44 M28 40 L24 48 M72 40 L76 48" />
    </Ink>
    <Ink fill="var(--color-ink)">
      <path d="M38 40 L62 40 L60 48 L40 48 Z" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M16 54 L84 54" />
    </Sketch>
  </ArtCanvas>
);

export const PaperStorm = () => (
  <ArtCanvas label="Paper Storm" bg={PAPER}>
    {/* swirling wind + loose sheets */}
    <Ink width={2.4}>
      <path d="M8 18 C24 10 40 26 56 16 C68 10 80 16 90 12" fill="none" />
      <path d="M6 34 C22 26 40 42 58 32 C72 26 84 32 94 28" fill="none" opacity="0.7" />
    </Ink>
    <Ink width={2} fill="var(--color-paper)">
      <path d="M30 40 L44 36 L46 48 L32 52 Z" />
      <path d="M58 42 L72 44 L68 56 L56 52 Z" />
      <path d="M44 22 L54 18 L56 28 L46 30 Z" opacity="0.9" />
    </Ink>
    <Sketch>
      <path d="M33 44 L42 41 M60 47 L69 49 M47 24 L53 22" />
    </Sketch>
    <Splotch cx={82} cy={48} r={2.4} />
  </ArtCanvas>
);

export const EditorsVerdict = () => (
  <ArtCanvas label="Editor's Verdict" bg="var(--color-paper-deep)">
    {/* doomed column of text */}
    <Ink width={2} fill={PAPER}>
      <path d="M18 54 L18 14 L54 8 L66 14 L66 54 Z" />
    </Ink>
    <Sketch>
      <path d="M26 24 L58 24 M26 32 L58 32 M26 40 L50 40 M26 46 L54 46" />
    </Sketch>
    {/* the giant strike-through */}
    <Ink width={5}>
      <path d="M14 50 L70 12" />
    </Ink>
    <Ink width={2.2}>
      <path d="M14 50 L70 12" stroke="var(--color-paper)" strokeWidth={1.6} opacity={0.5} />
    </Ink>
  </ArtCanvas>
);

export const AcceptanceStamp = () => (
  <ArtCanvas label="Acceptance Stamp" bg={PAPER}>
    {/* stamp with check */}
    <Ink fill="var(--color-paper-deep)">
      <path d="M42 6 L58 6 L58 14 L42 14 Z" />
      <path d="M34 14 L66 14 L66 24 L34 24 Z" />
      <path d="M30 24 L70 24 L70 34 L30 34 Z" />
    </Ink>
    <Ink width={2.6}>
      <path d="M40 30 L48 30" />
    </Ink>
    {/* radiating approval */}
    <Ink width={2.2}>
      <path d="M24 40 L16 46 M76 40 L84 46 M40 40 L34 50 M60 40 L66 50" />
      <path d="M32 44 L28 52 M68 44 L72 52" opacity="0.6" />
    </Ink>
    <Sketch>
      <path d="M18 56 L82 56" />
    </Sketch>
  </ArtCanvas>
);

export const TheFinalDraft = () => (
  <ArtCanvas label="The Final Draft" bg={PAPER}>
    <GroundLine />
    {/* ink golem rising from a puddle */}
    <Ink fill="var(--color-ink)">
      <path d="M20 52 C24 48 40 50 50 49 C64 48 76 50 82 53 C76 56 60 57 50 56 C38 57 26 55 20 52 Z" stroke="none" />
    </Ink>
    <Ink fill="var(--color-paper)">
      <rect x="36" y="30" width="28" height="18" rx="3" />
      <rect x="41" y="20" width="18" height="10" rx="2" />
      <path d="M36 36 L26 42 M64 36 L74 42" />
    </Ink>
    <Ink width={2}>
      <circle cx="47" cy="25" r="1.5" fill="var(--color-ink)" stroke="none" />
      <circle cx="53" cy="25" r="1.5" fill="var(--color-ink)" stroke="none" />
      <path d="M46 28 L54 28" />
    </Ink>
    <Sketch>
      <path d="M40 36 L60 36 M40 42 L58 42" />
    </Sketch>
    <Splotch cx={26} cy={55} r={2} />
    <Splotch cx={78} cy={56} r={1.6} />
  </ArtCanvas>
);

export const Foreword = () => (
  <ArtCanvas label="Foreword" bg="var(--color-paper-deep)">
    <Ink fill={PAPER}>
      {/* open book */}
      <path d="M50 48 C40 43 28 43 16 46 L16 28 C28 24 40 24 50 30 C60 24 72 24 84 28 L84 46 C72 43 60 43 50 48 Z" />
      <path d="M50 30 L50 48" />
    </Ink>
    {/* banner rising */}
    <Ink width={2.2} fill="var(--color-paper)">
      <path d="M28 18 L36 14 L44 17 L52 13 L60 16 L68 12 L72 20 L28 24 Z" />
    </Ink>
    <Sketch>
      <path d="M22 34 C32 31 40 32 46 35 M54 35 C62 32 70 31 78 34" />
      <path d="M24 40 C32 37 40 38 46 41 M54 41 C62 38 68 37 76 40" />
    </Sketch>
  </ArtCanvas>
);

export const BlotOut = () => (
  <ArtCanvas label="Blot Out" bg={PAPER}>
    {/* text being swallowed by a huge blot */}
    <Sketch>
      <path d="M12 22 L34 22 M12 30 L30 30 M12 38 L34 38" />
    </Sketch>
    <Ink fill="var(--color-ink)">
      <path
        d="M42 8 C60 2 84 12 86 28 C87 40 78 44 82 50 C86 58 70 62 60 56 C52 62 34 60 32 50 C22 50 20 38 28 34 C22 24 32 12 42 8 Z"
        stroke="none"
      />
    </Ink>
    <Ink width={2}>
      <Splotch cx={88} cy={16} r={2.6} />
      <Splotch cx={12} cy={50} r={2} />
    </Ink>
    <Sketch>
      <path d="M48 26 q6 -4 12 0 q6 4 12 0" opacity="0.6" />
    </Sketch>
  </ArtCanvas>
);

export const AshWing = () => (
  <ArtCanvas label="Ash Wing" bg="var(--color-paper-deep)">
    <Ink fill="var(--color-paper)">
      <path d="M50 44 C40 34 34 24 36 14 C44 20 50 28 52 36 C56 26 64 20 72 18 C68 28 62 38 54 44 Z" />
    </Ink>
    <Sketch>
      <path d="M50 44 L48 36 M52 40 L56 32" />
    </Sketch>
    <Ink width={2}>
      <path d="M40 50 q10 4 20 0" />
      <Splotch cx={34} cy={52} r={2} />
      <Splotch cx={68} cy={52} r={1.6} />
    </Ink>
  </ArtCanvas>
);

export const GhostText = () => (
  <ArtCanvas label="Ghost Text" bg={PAPER}>
    {/* faint spectral sentence with a wavy tail */}
    <Ink width={2}>
      <path d="M24 30 C28 26 32 26 36 30 C40 34 44 34 48 30" fill="none" opacity="0.9" />
      <path d="M28 38 L56 38" opacity="0.55" />
      <path d="M30 46 L52 46" opacity="0.35" />
    </Ink>
    <Sketch>
      <path d="M20 20 C30 14 46 14 56 20" strokeDasharray="3 3" />
      <circle cx="38" cy="29" r="1.2" fill="var(--color-ink)" stroke="none" />
      <circle cx="46" cy="29" r="1.2" fill="var(--color-ink)" stroke="none" />
    </Sketch>
  </ArtCanvas>
);

export const InkGolem = () => (
  <ArtCanvas label="Ink Golem" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      <rect x="38" y="26" width="24" height="18" rx="3" />
      <rect x="42" y="16" width="16" height="10" rx="2" />
      <path d="M38 32 L28 38 M62 32 L72 38" />
    </Ink>
    <Ink width={2}>
      <circle cx="47" cy="21" r="1.4" fill="var(--color-ink)" stroke="none" />
      <circle cx="53" cy="21" r="1.4" fill="var(--color-ink)" stroke="none" />
      <path d="M46 24 L54 24" />
    </Ink>
    <Sketch>
      <path d="M42 32 L58 32 M42 38 L56 38" />
      <path d="M40 44 L40 50 M60 44 L60 50" />
    </Sketch>
    <Splotch cx={30} cy={54} r={2} />
    <Splotch cx={70} cy={54} r={2} />
  </ArtCanvas>
);

export const TempoToken = () => (
  <ArtCanvas label="Tempo Token" bg="var(--color-paper-deep)">
    <Ink width={2.4} fill="var(--color-paper)">
      {/* mana droplet with wings of speed */}
      <path d="M50 12 C58 24 64 30 64 38 A14 14 0 1 1 36 38 C36 30 42 24 50 12 Z" />
    </Ink>
    <Sketch>
      <path d="M16 30 L28 30 M12 38 L24 38 M18 46 L28 46" />
      <path d="M72 30 L84 30 M76 38 L88 38 M72 46 L82 46" />
    </Sketch>
    <Ink width={2}>
      <path d="M50 26 L50 44 M44 36 L50 44 L56 36" />
    </Ink>
  </ArtCanvas>
);

import { ArtCanvas, GroundLine, Hatch, Ink, PAPER, Sketch, Splotch } from "./helpers";

export const Marginalia = () => (
  <ArtCanvas label="Marginalia" bg={PAPER}>
    <Ink width={2.2} fill="var(--color-paper-deep)">
      <path d="M22 8 L34 8 L34 56 L22 56 Z" />
      <path d="M62 8 L74 8 L74 56 L62 56 Z" />
    </Ink>
    <Sketch>
      <path d="M40 14 C48 10 54 16 50 22 C46 28 40 26 42 32" />
      <path d="M44 38 q6 4 12 0" />
      <path d="M42 46 l10 -2" />
      <circle cx="50" cy="52" r="1.4" fill="var(--color-ink)" stroke="none" />
    </Sketch>
    <Ink width={2}>
      <path d="M26 14 L30 14 M26 22 L30 22 M26 44 L30 44 M66 18 L70 18 M66 34 L70 34" />
    </Ink>
  </ArtCanvas>
);

export const PaperAirplane = () => (
  <ArtCanvas label="Paper Airplane" bg={PAPER}>
    <Sketch>
      <path d="M8 48 C20 46 26 42 34 40" strokeDasharray="4 3" />
      <path d="M6 54 C18 52 24 50 32 48" strokeDasharray="4 3" />
    </Sketch>
    <Ink fill="var(--color-paper)">
      <path d="M34 44 L88 20 L66 52 Z" />
      <path d="M34 44 L88 20 L58 38 Z" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={2}>
      <path d="M88 20 L72 36" />
    </Ink>
  </ArtCanvas>
);

export const InkwellSerpent = () => (
  <ArtCanvas label="Inkwell Serpent" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-ink)">
      <path d="M36 42 C32 48 36 55 50 55 C64 55 68 48 64 42 C64 42 36 42 36 42 Z" stroke="none" />
    </Ink>
    <Ink fill="var(--color-paper)">
      {/* serpent rising from the well */}
      <path d="M50 42 C50 34 44 32 44 26 C44 20 52 18 56 22 C60 26 57 32 52 32" />
      <path d="M52 18 L60 20 L53 24" />
    </Ink>
    <Ink width={2}>
      <circle cx="54" cy="21.5" r="1.2" fill="var(--color-ink)" stroke="none" />
      <path d="M60 20 L65 21" />
    </Ink>
    <Ink fill="var(--color-paper)">
      <ellipse cx="50" cy="40" rx="16" ry="4.5" />
    </Ink>
    <Splotch cx={70} cy={52} r={2} />
  </ArtCanvas>
);

export const GlueStick = () => (
  <ArtCanvas label="Glue Stick" bg={PAPER}>
    <GroundLine y={56} />
    <Ink fill="var(--color-paper-deep)">
      <path d="M40 20 L60 20 L60 50 L40 50 Z" />
      <path d="M42 20 L42 12 C42 9 58 9 58 12 L58 20" fill="var(--color-paper)" />
    </Ink>
    <Ink width={2}>
      <path d="M44 28 L56 28 M44 34 L56 34 M44 40 L52 40" />
      {/* glue bead */}
      <path d="M50 54 C52 50 54 52 53 56 C52 58 49 57 50 54 Z" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Hatch x={54} y={30} angle={45} length={12} count={4} width={1.2} />
  </ArtCanvas>
);

export const WaxSealWarden = () => (
  <ArtCanvas label="Wax Seal Warden" bg="var(--color-paper-deep)">
    <GroundLine />
    <Ink fill="var(--color-ink)">
      <path
        d="M50 20 C58 14 68 20 66 30 C65 36 60 38 62 43 C64 48 56 51 50 48 C44 51 36 48 38 43 C40 38 35 36 34 30 C32 20 42 14 50 20 Z"
        stroke="none"
      />
    </Ink>
    <Ink width={2.2} fill="var(--color-paper-deep)">
      <path d="M44 30 L50 25 L56 30 L50 35 Z" />
    </Ink>
    <Ink width={2}>
      {/* stamp handle above */}
      <path d="M44 16 C46 10 54 10 56 16" />
      <path d="M50 4 L50 10" />
      <circle cx="50" cy="3.5" r="1.6" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M28 52 L40 52 M62 52 L74 52" />
    </Sketch>
  </ArtCanvas>
);

export const TypewriterTerror = () => (
  <ArtCanvas label="Typewriter Terror" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      <path d="M26 34 L74 34 L70 50 L30 50 Z" />
      <path d="M32 34 C32 22 68 22 68 34" />
    </Ink>
    <Ink width={2}>
      {/* keys flying off */}
      <circle cx="34" cy="14" r="2.4" fill="none" />
      <circle cx="48" cy="9" r="2.4" fill="none" />
      <circle cx="64" cy="13" r="2.4" fill="none" />
      <path d="M36 18 L40 26 M50 12 L50 22 M62 17 L58 26" />
    </Ink>
    <Ink width={2.2}>
      <path d="M38 50 L34 56 M62 50 L66 56" />
      <path d="M42 40 L58 40" />
    </Ink>
    <Splotch cx={80} cy={20} r={1.8} />
  </ArtCanvas>
);

export const StickyNote = () => (
  <ArtCanvas label="Sticky Note" bg="var(--color-paper-deep)">
    <Ink fill="var(--color-paper)">
      <path d="M24 12 L68 12 L76 20 L76 52 L24 52 Z" />
      <path d="M68 12 L68 20 L76 20" />
    </Ink>
    <Ink width={2.2}>
      <path d="M32 24 L60 24 M32 32 L68 32 M32 40 L56 40" />
      {/* peeling corner */}
      <path d="M76 52 L68 44" />
    </Ink>
    <Sketch>
      <path d="M20 58 L80 58" strokeDasharray="3 3" />
    </Sketch>
    <Hatch x={30} y={46} angle={40} length={8} count={3} width={1.1} />
  </ArtCanvas>
);

export const LaminatedLegend = () => (
  <ArtCanvas label="Laminated Legend" bg={PAPER}>
    <Ink width={2.4}>
      <rect x="22" y="8" width="56" height="46" rx="4" fill="none" />
      <rect x="16" y="12" width="56" height="46" rx="4" fill="var(--color-paper)" />
    </Ink>
    {/* golem silhouette inside the sleeve */}
    <Ink fill="var(--color-paper-deep)">
      <rect x="34" y="26" width="20" height="16" rx="2" />
      <rect x="38" y="18" width="12" height="8" rx="2" />
    </Ink>
    <Ink width={2}>
      <circle cx="41" cy="22" r="1.2" fill="var(--color-ink)" stroke="none" />
      <circle cx="47" cy="22" r="1.2" fill="var(--color-ink)" stroke="none" />
      <path d="M24 18 L34 10 M26 26 L40 14" opacity="0.6" />
    </Ink>
    <Sketch>
      <path d="M60 30 C66 24 70 34 62 38" />
    </Sketch>
  </ArtCanvas>
);

export const TheRedThesaurus = () => (
  <ArtCanvas label="The Red Thesaurus" bg="var(--color-paper-deep)">
    <Ink fill="var(--color-paper)">
      {/* thick tome */}
      <path d="M26 12 L66 12 C74 12 76 18 74 24 L74 48 C76 52 72 56 66 56 L26 56 Z" />
      <path d="M26 12 C20 12 18 18 20 24 L20 48 C18 52 22 56 26 56" />
    </Ink>
    <Ink width={2.2}>
      <path d="M24 20 C34 16 44 20 54 17" />
      <path d="M24 30 L70 30" />
      {/* nib crown */}
      <path d="M44 6 L40 12 L48 12 Z" fill="var(--color-ink)" />
    </Ink>
    <Sketch>
      <path d="M28 38 L64 38 M28 44 L58 44" />
    </Sketch>
    <Hatch x={62} y={40} angle={50} length={12} count={4} width={1.1} />
  </ArtCanvas>
);

export const Doodle = () => (
  <ArtCanvas label="Doodle" bg={PAPER}>
    {/* hand drawing a tiny ghost */}
    <Ink fill="var(--color-paper)">
      <path d="M60 46 C66 40 74 42 78 48 C82 54 78 58 72 56 C66 60 56 54 60 46 Z" />
    </Ink>
    <Ink width={2.2}>
      <path d="M64 46 L54 38" />
      <path d="M54 38 L46 30" />
      <path d="M46 30 L42 26 L46 34 Z" fill="var(--color-ink)" />
    </Ink>
    {/* the doodled ghost */}
    <Ink width={2}>
      <path d="M28 22 C34 14 44 16 44 26 C44 32 40 34 40 40 L36 37 L32 40 L28 37 L24 40 C24 34 22 26 28 22 Z" fill="none" />
      <circle cx="31" cy="25" r="1.2" fill="var(--color-ink)" stroke="none" />
      <circle cx="39" cy="25" r="1.2" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M20 50 C30 46 40 52 52 48" strokeDasharray="3 3" />
    </Sketch>
  </ArtCanvas>
);

export const SecondWind = () => (
  <ArtCanvas label="Second Wind" bg={PAPER}>
    <Ink width={2.4}>
      {/* swirl of wind */}
      <path d="M18 34 C26 24 42 22 52 28 C64 34 70 30 76 22" fill="none" />
      <path d="M24 44 C32 36 44 34 54 40 C62 44 70 42 78 36" fill="none" opacity="0.7" />
    </Ink>
    <Ink width={2} fill="var(--color-paper)">
      {/* a page lifted by the wind */}
      <path d="M42 18 L54 12 L58 24 L46 28 Z" />
    </Ink>
    <Ink width={2}>
      <path d="M12 54 L28 54 M64 52 L84 52" opacity="0.5" />
      <path d="M86 24 L92 20" strokeLinecap="round" />
    </Ink>
    <Sketch>
      <path d="M30 12 l4 -4 M40 8 l2 -5" />
    </Sketch>
  </ArtCanvas>
);

export const MarginCall = () => (
  <ArtCanvas label="Margin Call" bg="var(--color-paper-deep)">
    <Ink width={2.2} fill="var(--color-paper)">
      <path d="M34 10 L66 10 L66 54 L34 54 Z" />
    </Ink>
    <Ink width={2}>
      {/* ruled margin line called out */}
      <path d="M40 10 L40 54" />
      <path d="M50 20 L58 20 M50 30 L62 30 M50 40 L56 40" />
      {/* call-out arrow */}
      <path d="M66 32 C74 32 76 40 70 44" fill="none" />
      <path d="M70 44 L64 46 M70 44 L72 38" />
    </Ink>
    <Sketch>
      {/* a small heart in the margin */}
      <path d="M24 36 C22 32 26 30 28 33 C30 30 34 32 32 36 C30 39 26 39 24 36 Z" />
    </Sketch>
  </ArtCanvas>
);

export const PlotTwist = () => (
  <ArtCanvas label="Plot Twist" bg={PAPER}>
    <Ink fill="var(--color-paper)">
      {/* open book */}
      <path d="M50 40 C40 35 28 35 18 38 L18 22 C28 18 40 18 50 24 C60 18 72 18 82 22 L82 38 C72 35 60 35 50 40 Z" />
      <path d="M50 24 L50 40" />
    </Ink>
    <Ink width={2.6}>
      {/* swirling question mark rising */}
      <path d="M58 16 C62 8 74 10 74 18 C74 24 66 24 66 30" fill="none" />
      <circle cx="66" cy="35" r="1.8" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M24 28 C32 25 40 26 46 29 M54 29 C62 26 70 25 78 28" />
      <path d="M26 34 C32 32 38 33 44 35" />
    </Sketch>
  </ArtCanvas>
);

export const FreshPage = () => (
  <ArtCanvas label="Fresh Page" bg="var(--color-paper-deep)">
    <Ink fill={PAPER}>
      <path d="M30 52 L30 16 L54 10 L70 16 L70 52 Z" />
    </Ink>
    {/* curling page corner */}
    <Ink fill="var(--color-paper-deep)">
      <path d="M54 10 C58 16 64 18 70 16 C66 22 60 24 54 22 Z" />
    </Ink>
    <Ink width={2}>
      <path d="M54 10 L54 16 L70 16" />
      <path d="M38 28 L48 28 M38 36 L52 36 M38 44 L48 44" opacity="0.5" />
    </Ink>
    <Ink width={1.8}>
      <path d="M22 12 L26 8 M20 24 L15 22 M26 4 L28 0" opacity="0.8" />
    </Ink>
  </ArtCanvas>
);

export const InkWash = () => (
  <ArtCanvas label="Ink Wash" bg={PAPER}>
    {/* one broad brush wash */}
    <Ink fill="var(--color-ink)">
      <path
        d="M8 30 C20 20 34 26 46 20 C60 14 74 22 92 16 L92 30 C78 36 62 30 48 36 C34 42 20 38 8 44 Z"
        stroke="none"
      />
    </Ink>
    {/* brush */}
    <Ink width={2.2} fill="var(--color-paper)">
      <path d="M70 46 L88 56 L86 50 Z" />
    </Ink>
    <Ink width={2}>
      <path d="M70 46 L60 34 L64 30 L74 44 Z" fill="var(--color-ink)" stroke="none" />
      <path d="M88 56 L92 60" />
    </Ink>
    <Sketch>
      <path d="M12 52 C24 48 36 54 50 50" strokeDasharray="4 3" />
    </Sketch>
  </ArtCanvas>
);

export const TheSecondPrinting = () => (
  <ArtCanvas label="The Second Printing" bg="var(--color-paper-deep)">
    {/* press stamping out two golems */}
    <Ink fill="var(--color-paper)">
      <path d="M30 8 L70 8 L70 18 L30 18 Z" />
      <path d="M34 18 L66 18 L66 26 L34 26 Z" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={2}>
      <path d="M50 26 L50 32" />
    </Ink>
    {/* two small golems below */}
    <Ink fill="var(--color-paper)">
      <rect x="28" y="38" width="16" height="12" rx="2" />
      <rect x="56" y="38" width="16" height="12" rx="2" />
      <rect x="31" y="30" width="10" height="8" rx="2" />
      <rect x="59" y="30" width="10" height="8" rx="2" />
    </Ink>
    <Ink width={2}>
      <circle cx="34" cy="34" r="1.1" fill="var(--color-ink)" stroke="none" />
      <circle cx="38" cy="34" r="1.1" fill="var(--color-ink)" stroke="none" />
      <circle cx="62" cy="34" r="1.1" fill="var(--color-ink)" stroke="none" />
      <circle cx="66" cy="34" r="1.1" fill="var(--color-ink)" stroke="none" />
      <path d="M24 52 L46 52 M52 52 L74 52" />
    </Ink>
    <Sketch>
      <path d="M20 30 L16 26 M80 30 L84 26" />
    </Sketch>
  </ArtCanvas>
);

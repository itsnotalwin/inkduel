import { ArtCanvas, GroundLine, Hatch, Ink, PAPER, Sketch, Splotch } from "./helpers";

export const ApprenticeScribe = () => (
  <ArtCanvas label="Apprentice Scribe" bg={PAPER}>
    <GroundLine y={56} />
    {/* writing desk */}
    <Ink fill="var(--color-paper-deep)">
      <path d="M14 40 L74 40 L78 45 L18 45 Z" />
      <path d="M22 45 L20 56 M70 45 L72 56" />
    </Ink>
    {/* page on the desk */}
    <Ink width={2} fill="var(--color-paper)">
      <path d="M26 40 L34 30 L54 32 L52 40 Z" />
    </Ink>
    <Sketch>
      <path d="M32 36 l8 -1 M34 38 l8 -1" />
    </Sketch>
    {/* scribe behind the desk, quill raised */}
    <Ink fill="var(--color-paper)">
      <circle cx="66" cy="24" r="7" />
      <path d="M59 42 C58 33 62 30 66 30 C70 30 74 33 73 42" />
      <path d="M61 34 C54 32 50 34 46 38" />
    </Ink>
    <Ink width={2.4}>
      <path d="M46 38 L40 34" />
      <path d="M40 34 C34 26 36 16 44 14 C38 20 40 28 44 31" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={2}>
      <circle cx="64" cy="23" r="1.2" fill="var(--color-ink)" stroke="none" />
      <circle cx="69" cy="23" r="1.2" fill="var(--color-ink)" stroke="none" />
    </Ink>
  </ArtCanvas>
);

export const OrigamiCrane = () => (
  <ArtCanvas label="Origami Crane" bg={PAPER}>
    <Ink fill="var(--color-paper)">
      {/* wings */}
      <path d="M48 40 L40 14 L56 34 Z" />
      <path d="M56 34 L72 12 L64 40 Z" />
      {/* body diamond */}
      <path d="M34 44 L52 34 L70 44 L52 54 Z" fill="var(--color-paper-deep)" />
      {/* tail */}
      <path d="M34 44 L14 36 L36 50 Z" />
      {/* neck + head */}
      <path d="M70 44 L84 30 L88 34 L82 38" />
    </Ink>
    <Sketch>
      <path d="M48 40 L64 40 M52 34 L52 54" />
      <circle cx="86" cy="33" r="1" fill="var(--color-ink)" stroke="none" />
    </Sketch>
  </ArtCanvas>
);

export const GraphiteGolem = () => (
  <ArtCanvas label="Graphite Golem" bg="var(--color-paper-deep)">
    <GroundLine y={56} />
    <Ink fill="var(--color-paper)">
      <rect x="34" y="22" width="32" height="26" rx="3" />
      <rect x="40" y="10" width="20" height="12" rx="2" />
      <path d="M34 30 L20 36 L26 42 L34 38" />
      <path d="M66 30 L80 36 L74 42 L66 38" />
      <path d="M40 48 L36 56 M60 48 L64 56" />
    </Ink>
    <Ink width={2}>
      <circle cx="46" cy="16" r="1.6" fill="var(--color-ink)" stroke="none" />
      <circle cx="54" cy="16" r="1.6" fill="var(--color-ink)" stroke="none" />
      <path d="M45 19.5 L55 19.5" />
    </Ink>
    <Sketch>
      <path d="M40 26 L58 26 M40 34 L62 34 M40 42 L56 42" />
    </Sketch>
    <Hatch x={58} y={26} angle={45} length={16} count={5} width={1.2} />
  </ArtCanvas>
);

export const PageKnight = () => (
  <ArtCanvas label="Page Knight" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper-deep)">
      {/* kite shield planted on the ground */}
      <path d="M50 16 C63 20 66 22 65 34 C64 46 56 52 50 56 C44 52 36 46 35 34 C34 22 37 20 50 16 Z" />
      {/* helmet dome planted on the shield's top edge */}
      <path d="M42 16 C42 7.5 58 7.5 58 16 L58 17.5 L42 17.5 Z" fill="var(--color-paper)" />
    </Ink>
    <Ink width={2.2}>
      {/* folded-page crest */}
      <path d="M44 30 L50 26 L56 30 L50 34 Z" fill="var(--color-paper)" />
      {/* visor slit */}
      <path d="M46 12.5 L54 12.5" strokeWidth={2.6} />
    </Ink>
    {/* pennant pole */}
    <Ink width={2}>
      <path d="M70 42 L70 16" />
      <path d="M70 16 L82 20 L70 24 Z" fill="var(--color-paper-deep)" />
    </Ink>
    <Hatch x={40} y={42} angle={45} length={10} count={4} width={1.2} />
    <Sketch>
      <path d="M18 12 L26 12 M18 16 L23 16" />
    </Sketch>
  </ArtCanvas>
);

export const InkwellImp = () => (
  <ArtCanvas label="Inkwell Imp" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-ink)">
      <path d="M34 40 C30 46 34 54 50 54 C66 54 70 46 66 40 C66 40 34 40 34 40 Z" stroke="none" />
    </Ink>
    <Ink fill="var(--color-paper)">
      <ellipse cx="50" cy="38" rx="18" ry="5" />
      {/* imp head & body above the rim */}
      <circle cx="50" cy="22" r="9" />
      <path d="M42 16 L38 9 L45 13 M58 16 L62 9 L55 13" />
      <path d="M43 28 C40 32 38 34 34 36 M57 28 C60 32 62 34 66 36" />
    </Ink>
    <Ink width={2.2}>
      <circle cx="47" cy="21" r="1.5" fill="var(--color-ink)" stroke="none" />
      <circle cx="53" cy="21" r="1.5" fill="var(--color-ink)" stroke="none" />
      <path d="M46 26 Q50 29 54 26" />
      <path d="M66 44 C74 44 76 50 70 52" />
    </Ink>
    <Splotch cx={30} cy={52} r={3} />
    <Splotch cx={72} cy={54} r={2.2} />
  </ArtCanvas>
);

export const QuillSergeant = () => (
  <ArtCanvas label="Quill Sergeant" bg="var(--color-paper-deep)">
    <GroundLine />
    <Ink fill="var(--color-paper)">
      <path d="M50 54 C46 42 44 28 50 10 C58 20 60 36 54 54 Z" />
      <path d="M50 52 L50 12" />
    </Ink>
    <Ink width={2.4}>
      <path d="M44 34 L50 30 L56 34" />
      <path d="M44 41 L50 37 L56 41" />
    </Ink>
    <Sketch>
      <path d="M50 16 L55 20 M50 22 L56 25 M50 28 L57 30" />
    </Sketch>
    <Ink width={2.2}>
      <path d="M50 54 L42 58 M50 54 L58 58" />
    </Ink>
  </ArtCanvas>
);

export const FountainPenFencer = () => (
  <ArtCanvas label="Fountain Pen Fencer" bg={PAPER}>
    <Sketch>
      <path d="M8 30 h10 M6 38 h12 M10 46 h8" />
    </Sketch>
    <Ink fill="var(--color-paper)">
      {/* fencer lunging */}
      <circle cx="42" cy="22" r="6" />
      <path d="M42 28 C36 34 34 42 38 48 L48 48 C50 40 50 34 46 28" />
      <path d="M38 48 L30 56 M48 48 L56 44" />
      <path d="M44 30 L58 22" />
    </Ink>
    <Ink width={2.6} fill="var(--color-paper)">
      {/* the pen as blade */}
      <path d="M58 22 L84 12 L88 15 L62 27 Z" />
      <path d="M84 12 L88 8 L91 12 L88 15 Z" fill="var(--color-ink)" />
    </Ink>
    <Ink width={2}>
      <path d="M30 22 C34 20 38 20 42 22" />
    </Ink>
    <Sketch>
      <path d="M70 26 L78 24 M72 32 L82 30" />
    </Sketch>
  </ArtCanvas>
);

export const PapercraftColossus = () => (
  <ArtCanvas label="Papercraft Colossus" bg="var(--color-paper-deep)">
    <GroundLine y={58} />
    <Ink fill="var(--color-paper)">
      <path d="M36 58 L40 24 L60 24 L64 58 Z" />
      <path d="M42 12 L58 12 L60 24 L40 24 Z" />
      <path d="M40 28 L20 36 L24 46 L40 40" />
      <path d="M60 28 L80 36 L76 46 L60 40" />
    </Ink>
    <Ink width={2}>
      <path d="M46 16 L46 20 M54 16 L54 20" />
      <path d="M46 19 L54 19" />
    </Ink>
    <Sketch>
      <path d="M50 24 L50 58 M42 30 L36 58 M58 30 L64 58" />
    </Sketch>
    <Hatch x={56} y={30} angle={45} length={22} count={6} width={1.2} />
  </ArtCanvas>
);

export const EraserGolem = () => (
  <ArtCanvas label="Eraser Golem" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      <path d="M32 54 L32 30 C32 20 42 14 50 14 C58 14 68 20 68 30 L68 54 Z" />
      <path d="M32 34 L68 34" />
    </Ink>
    <Ink width={2}>
      <circle cx="43" cy="26" r="1.6" fill="var(--color-ink)" stroke="none" />
      <circle cx="57" cy="26" r="1.6" fill="var(--color-ink)" stroke="none" />
      <path d="M44 50 L44 54 M56 50 L56 54" />
    </Ink>
    <Sketch>
      <path d="M36 40 L64 40 M36 46 L64 46" />
      <path d="M22 56 l4 -2 3 2 M74 54 l4 -2 3 2" />
    </Sketch>
    <Hatch x={56} y={38} angle={-40} length={12} count={4} width={1.2} />
  </ArtCanvas>
);

export const StencilArcher = () => (
  <ArtCanvas label="Stencil Archer" bg={PAPER}>
    <Ink width={2.6}>
      {/* bow */}
      <path d="M40 12 C26 24 26 38 40 50" fill="none" />
      <path d="M40 12 L40 50" strokeWidth={1.8} />
      {/* drawn arrow */}
      <path d="M30 31 L72 31" />
      <path d="M72 31 L64 27 M72 31 L64 35" />
    </Ink>
    <Ink fill="var(--color-paper)">
      <circle cx="30" cy="31" r="5" />
    </Ink>
    {/* dashed stencil target */}
    <g stroke="var(--color-graphite)" strokeWidth="1.8" fill="none" strokeDasharray="4 3">
      <circle cx="82" cy="31" r="12" />
      <circle cx="82" cy="31" r="6" />
    </g>
    <Ink width={2}>
      <circle cx="82" cy="31" r="1.8" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M44 20 C50 24 50 38 44 42" />
    </Sketch>
  </ArtCanvas>
);

export const BlottingWall = () => (
  <ArtCanvas label="Blotting Wall" bg="var(--color-paper-deep)">
    <Ink fill="var(--color-paper)">
      <path d="M10 56 L12 16 Q50 12 88 16 L90 56 Z" />
    </Ink>
    <Ink width={1.8}>
      <path d="M12 24 L88 24 M12 33 L88 33 M12 42 L88 42 M12 50 L88 50" />
      <path d="M32 16 L32 24 M56 16 L56 24 M76 16 L76 24" />
      <path d="M22 24 L22 33 M46 24 L46 33 M68 24 L68 33" />
      <path d="M32 33 L32 42 M56 33 L56 42 M78 33 L78 42" />
      <path d="M22 42 L22 50 M46 42 L46 50 M68 42 L68 50" />
    </Ink>
    <Splotch cx={38} cy={38} r={5} />
    <Splotch cx={66} cy={46} r={4} />
    <Splotch cx={54} cy={28} r={3} opacity={0.85} />
    <Sketch>
      <path d="M16 12 L20 8 M40 11 L44 7" />
    </Sketch>
  </ArtCanvas>
);

export const InkMage = () => (
  <ArtCanvas label="Ink Mage" bg={PAPER}>
    <GroundLine />
    {/* tall hooded robe */}
    <Ink fill="var(--color-paper)">
      <path d="M50 6 C58 10 60 18 58 26 C62 36 62 48 58 54 L42 54 C38 48 38 36 42 26 C40 18 42 10 50 6 Z" />
      {/* hollow hood — a void with two ink eyes */}
      <path d="M44 22 C44 30 56 30 56 22 C56 15 44 15 44 22 Z" fill="var(--color-ink)" />
    </Ink>
    {/* sleeves pouring ink */}
    <Ink width={2.2} fill="var(--color-paper)">
      <path d="M42 30 C36 32 32 36 30 40 L36 44 C38 40 40 38 44 38" />
      <path d="M58 30 C64 32 68 36 70 40 L64 44 C62 40 60 38 56 38" />
    </Ink>
    {/* ink swirls rising from both hands */}
    <Ink width={2.4}>
      <path d="M26 34 C22 30 24 24 30 24" fill="none" />
      <path d="M74 34 C78 30 76 24 70 24" fill="none" />
    </Ink>
    <Splotch cx={24} cy={48} r={3.2} />
    <Splotch cx={76} cy={48} r={3.2} />
    <Splotch cx={50} cy={12} r={2} opacity={0.9} />
  </ArtCanvas>
);

export const InkBlot = () => (
  <ArtCanvas label="Ink Blot" bg={PAPER}>
    <Ink fill="var(--color-ink)">
      <path
        d="M50 12 C64 10 78 20 76 34 C75 42 68 44 70 50 C72 56 62 58 56 54 C50 60 34 60 30 52 C22 52 20 42 26 38 C20 30 28 18 38 18 C40 12 46 13 50 12 Z"
        stroke="none"
      />
    </Ink>
    <Ink width={2.2}>
      <path d="M84 18 C88 16 90 20 87 22 C84 24 82 20 84 18 Z" fill="var(--color-ink)" stroke="none" />
      <path d="M14 40 C11 38 13 34 16 36 C19 38 17 42 14 40 Z" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M38 30 q6 -4 12 0 q6 4 12 0" />
      <path d="M40 40 q5 4 10 0 q5 -4 10 0" />
    </Sketch>
  </ArtCanvas>
);

export const PaperSwan = () => (
  <ArtCanvas label="Paper Swan" bg={PAPER}>
    <Sketch>
      <path d="M8 54 Q30 52 50 53 T94 52" />
    </Sketch>
    <Ink fill="var(--color-paper-deep)">
      {/* folded hull: tail rises left, keel drops, bow at right */}
      <path d="M16 52 L42 30 L52 38 L86 52 Z" />
      <path d="M42 30 L50 52" />
      {/* raised folded wing */}
      <path d="M42 30 L36 14 L58 32 Z" fill="var(--color-paper)" />
    </Ink>
    {/* S-neck rising from the bow, head curled */}
    <Ink fill="var(--color-paper)">
      <path d="M80 52 C82 42 84 36 82 28 C81 22.5 86.5 19.5 89.5 23 C92.5 26.5 90.5 31.5 86 31" />
      <path d="M89.5 23 L96.5 26 L89.5 29" />
    </Ink>
    <circle cx="86.5" cy="25.5" r="1.1" fill="var(--color-ink)" stroke="none" />
    <Sketch>
      <path d="M30 44 L58 40" />
      <path d="M38 48 L70 44" />
    </Sketch>
    <Hatch x={62} y={46} angle={-35} length={12} count={4} />
  </ArtCanvas>
);

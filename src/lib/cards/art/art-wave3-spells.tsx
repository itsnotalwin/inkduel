import { ArtCanvas, GroundLine, Hatch, Ink, PAPER, Sketch, Splotch } from "./helpers";

export const InkDrop = () => (
  <ArtCanvas label="Ink Drop" bg={PAPER}>
    <Ink width={2.2} fill="var(--color-ink)">
      <path d="M50 10 C56 20 62 26 62 34 A12 12 0 1 1 38 34 C38 26 44 20 50 10 Z" stroke="none" />
    </Ink>
    {/* ripple rings */}
    <Ink width={1.8}>
      <ellipse cx="50" cy="50" rx="26" ry="6" fill="none" />
      <ellipse cx="50" cy="50" rx="16" ry="4" fill="none" opacity="0.7" />
    </Ink>
    <Sketch>
      <path d="M20 16 L24 12 M80 16 L76 12" />
    </Sketch>
  </ArtCanvas>
);

export const StickySituation = () => (
  <ArtCanvas label="Sticky Situation" bg={PAPER}>
    <Ink fill="var(--color-paper-deep)">
      {/* a figure stuck to a sticky patch */}
      <circle cx="50" cy="20" r="7" />
      <path d="M40 46 C40 30 60 30 60 46" />
    </Ink>
    <Ink width={2.4}>
      {/* sticky floor */}
      <path d="M14 52 C26 48 38 54 50 50 C62 46 74 52 86 48" />
      <path d="M30 50 C32 46 36 46 38 49" opacity="0.6" />
      <path d="M64 50 C66 46 70 46 72 49" opacity="0.6" />
    </Ink>
    <Ink width={2}>
      <path d="M46 18 L48 14 M54 18 L52 14" />
      <path d="M44 26 Q50 22 56 26" />
    </Ink>
  </ArtCanvas>
);

export const Brainstorm = () => (
  <ArtCanvas label="Brainstorm" bg={PAPER}>
    <Ink fill="var(--color-paper)">
      {/* head in profile with a storm above */}
      <path d="M34 50 C30 40 32 28 42 24 C52 20 64 26 64 36 C64 44 58 48 52 50 Z" />
    </Ink>
    <Ink width={2}>
      {/* lightning thought */}
      <path d="M48 6 L42 16 L48 16 L42 26" fill="none" />
      <path d="M56 10 L62 8 M60 20 L68 22" opacity="0.7" />
    </Ink>
    <Sketch>
      <path d="M24 12 L28 8 M30 20 L36 18" />
    </Sketch>
    <Hatch x={40} y={34} angle={40} length={10} count={3} width={1.1} />
  </ArtCanvas>
);

export const PaperTrail = () => (
  <ArtCanvas label="Paper Trail" bg={PAPER}>
    <Ink width={2} fill="var(--color-paper)">
      {/* trail of papers */}
      <path d="M16 40 L28 36 L30 46 L18 50 Z" />
      <path d="M38 32 L50 28 L52 38 L40 42 Z" fill="var(--color-paper-deep)" />
      <path d="M62 22 L74 18 L76 28 L64 32 Z" />
    </Ink>
    <Ink width={2.4}>
      {/* the beast at the end of the trail */}
      <path d="M80 20 C88 16 94 24 90 32 C86 40 74 38 76 28" fill="none" />
      <circle cx="85" cy="27" r="1.6" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M20 54 L80 54" strokeDasharray="4 3" />
    </Sketch>
  </ArtCanvas>
);

export const EraseAndRedraw = () => (
  <ArtCanvas label="Erase and Redraw" bg={PAPER}>
    <Ink width={2}>
      {/* a figure half-erased, half-redrawn */}
      <circle cx="50" cy="18" r="6" fill="var(--color-paper)" />
      <path d="M44 46 C44 30 56 30 56 46" fill="none" />
    </Ink>
    <Sketch>
      {/* erased left half */}
      <path d="M44 20 C40 18 38 22 40 26" strokeDasharray="2 3" />
      <path d="M44 34 C40 32 38 36 40 40" strokeDasharray="2 3" />
      {/* eraser crumbs */}
      <path d="M20 52 l3 -2 2 3 Z" fill="var(--color-pencil)" stroke="none" />
      <path d="M30 54 l3 -2 2 3 Z" fill="var(--color-pencil)" stroke="none" />
      <path d="M26 48 l2 -1 1 2 Z" fill="var(--color-pencil)" stroke="none" />
    </Sketch>
    {/* fresh ink on the right */}
    <Ink width={2.2}>
      <path d="M56 34 L64 30" />
      <circle cx="54" cy="18" r="1.2" fill="var(--color-ink)" stroke="none" />
    </Ink>
  </ArtCanvas>
);

export const WaxSeal = () => (
  <ArtCanvas label="Wax Seal" bg={PAPER}>
    <Ink fill="var(--color-ink)">
      <path d="M50 22 C58 16 68 22 66 32 C65 38 60 40 62 45 C64 50 56 53 50 50 C44 53 36 50 38 45 C40 40 35 38 34 32 C32 22 42 16 50 22 Z" stroke="none" />
    </Ink>
    <Ink width={2.2}>
      {/* twinstrike mark inside */}
      <path d="M42 32 L50 38 M50 38 L58 32" stroke="var(--color-paper)" />
      <path d="M42 38 L50 32 M50 32 L58 38" stroke="var(--color-paper)" opacity="0.7" />
    </Ink>
    <Sketch>
      <path d="M22 12 L30 8 M70 12 L62 8" />
    </Sketch>
  </ArtCanvas>
);

export const PaperShredder = () => (
  <ArtCanvas label="Paper Shredder" bg="var(--color-paper-deep)">
    <Ink fill="var(--color-paper)">
      <path d="M30 8 L70 8 L70 22 L30 22 Z" />
      <path d="M28 22 L72 22 L72 34 L28 34 Z" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={2}>
      {/* shredder teeth */}
      <path d="M32 34 L36 38 L40 34 L44 38 L48 34 L52 38 L56 34 L60 38 L64 34 L68 38" fill="none" />
    </Ink>
    <Ink width={1.8}>
      {/* strips falling */}
      <path d="M36 44 L34 54 M44 44 L43 56 M52 44 L53 54 M60 44 L62 56" />
    </Ink>
    <Sketch>
      <path d="M36 14 L64 14" />
    </Sketch>
  </ArtCanvas>
);

export const RedLetterDay = () => (
  <ArtCanvas label="Red Letter Day" bg={PAPER}>
    <Ink width={2} fill="var(--color-paper)">
      {/* envelope, seal broken */}
      <path d="M20 24 L50 10 L80 24 L80 48 L20 48 Z" />
      <path d="M20 24 L50 36 L80 24" />
    </Ink>
    <Ink width={2.6}>
      {/* red-letter burst */}
      <path d="M50 40 L50 50 M42 44 L58 44" opacity="0.9" />
      <path d="M50 2 L50 8 M34 6 L37 11 M66 6 L63 11" />
    </Ink>
    <Sketch>
      <path d="M30 42 L44 42" />
    </Sketch>
  </ArtCanvas>
);

export const FoolsCap = () => (
  <ArtCanvas label="Fool's Cap" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      {/* jester's cap made of folded paper */}
      <path d="M34 40 C34 24 44 12 50 8 C56 12 66 24 66 40 Z" />
      <path d="M50 8 L50 2" />
      <circle cx="50" cy="2" r="2.4" fill="var(--color-ink)" />
    </Ink>
    <Ink width={2}>
      {/* drooping points with bells */}
      <path d="M34 40 C30 42 28 46 30 50" fill="none" />
      <path d="M66 40 C70 42 72 46 70 50" fill="none" />
      <circle cx="30" cy="51" r="1.8" fill="none" />
      <circle cx="70" cy="51" r="1.8" fill="none" />
    </Ink>
    <Sketch>
      <path d="M40 30 C46 26 54 26 60 30" />
    </Sketch>
  </ArtCanvas>
);

export const WideMarginVictory = () => (
  <ArtCanvas label="Wide Margin Victory" bg="var(--color-paper-deep)">
    {/* a page with victory stamped far into the margin */}
    <Ink width={2} fill={PAPER}>
      <path d="M20 10 L58 10 L58 54 L20 54 Z" />
    </Ink>
    <Sketch>
      <path d="M26 20 L52 20 M26 28 L52 28 M26 36 L46 36" />
    </Sketch>
    <Ink width={2.4}>
      {/* big V stamp out in the margin */}
      <path d="M66 20 L76 44 L88 18" fill="none" />
      <path d="M62 48 L92 44" opacity="0.6" />
    </Ink>
    <Splotch cx={90} cy={12} r={2} />
  </ArtCanvas>
);

export const ReinforcedMargins = () => (
  <ArtCanvas label="Reinforced Margins" bg={PAPER}>
    <Ink width={2} fill={PAPER}>
      <path d="M28 12 L72 12 L72 52 L28 52 Z" />
    </Ink>
    {/* reinforced edges — layered bold borders */}
    <Ink width={3}>
      <path d="M28 12 L28 52 M72 12 L72 52 M28 12 L72 12 M28 52 L72 52" />
    </Ink>
    <Ink width={2}>
      <path d="M24 12 L24 52 M76 12 L76 52 M28 8 L72 8 M28 56 L72 56" opacity="0.8" />
      {/* stitched corners */}
      <path d="M28 16 L34 12 M66 52 L72 48" />
    </Ink>
    <Sketch>
      <path d="M36 24 L64 24 M36 32 L64 32 M36 40 L56 40" />
    </Sketch>
  </ArtCanvas>
);

export const SigningBonus = () => (
  <ArtCanvas label="Signing Bonus" bg={PAPER}>
    <Ink width={2} fill="var(--color-paper)">
      {/* contract page with a signature line */}
      <path d="M26 8 L62 8 L62 40 L26 40 Z" />
    </Ink>
    <Sketch>
      <path d="M32 16 L56 16 M32 22 L56 22 M32 28 L50 28" />
    </Sketch>
    <Ink width={2.2}>
      {/* flamboyant signature */}
      <path d="M28 48 C36 42 40 50 48 46 C54 43 60 48 66 44 C72 41 78 46 84 42" fill="none" />
      <path d="M28 52 L84 52" opacity="0.5" />
      {/* coins */}
      <circle cx="74" cy="20" r="4" fill="none" />
      <circle cx="82" cy="26" r="4" fill="none" />
      <path d="M74 20 L74 20" />
    </Ink>
    <Ink width={1.6}>
      <path d="M74 20 L74 20" />
      <path d="M72 18 h4 M72 22 h4" opacity="0.8" />
      <path d="M80 24 h4 M80 28 h4" opacity="0.8" />
    </Ink>
  </ArtCanvas>
);

export const TheLongLetter = () => (
  <ArtCanvas label="The Long Letter" bg="var(--color-paper-deep)">
    <Ink width={2} fill={PAPER}>
      {/* a very long scroll */}
      <path d="M38 4 L62 4 L62 56 L38 56 Z" />
      <path d="M38 4 C34 4 34 10 38 10 M62 4 C66 4 66 10 62 10" />
    </Ink>
    <Sketch>
      <path d="M44 12 L56 12 M44 18 L56 18 M44 24 L56 24 M44 30 L56 30 M44 36 L56 36 M44 42 L56 42" />
    </Sketch>
    <Ink width={2}>
      {/* reading fatigue lines */}
      <path d="M30 20 L36 18 M30 30 L36 30 M70 26 L64 24" opacity="0.6" />
      <circle cx="50" cy="50" r="1.6" fill="var(--color-ink)" stroke="none" />
    </Ink>
  </ArtCanvas>
);

export const RedInkFlood = () => (
  <ArtCanvas label="Red Ink Flood" bg={PAPER}>
    <Ink fill="var(--color-ink)">
      {/* flood wave of ink */}
      <path d="M6 34 C16 24 26 36 38 30 C50 24 60 36 72 30 C82 26 90 32 94 28 L94 46 C80 52 62 46 46 50 C30 54 14 50 6 44 Z" stroke="none" />
    </Ink>
    <Ink width={2}>
      {/* spray */}
      <path d="M30 22 C32 18 36 16 40 16" fill="none" opacity="0.7" />
      <Splotch cx={26} cy={20} r={2} />
      <Splotch cx={70} cy={18} r={2.4} />
      <path d="M14 54 L86 54" opacity="0.5" />
    </Ink>
    <Sketch>
      <path d="M16 12 L20 8 M84 12 L80 8" />
    </Sketch>
  </ArtCanvas>
);

export const FinalNotice = () => (
  <ArtCanvas label="Final Notice" bg={PAPER}>
    <Ink width={2} fill={PAPER}>
      {/* ominous envelope, oversized */}
      <path d="M14 20 L50 4 L86 20 L86 48 L14 48 Z" />
      <path d="M14 20 L50 34 L86 20" />
    </Ink>
    <Ink width={3}>
      {/* bold FINAL banner */}
      <path d="M26 38 L74 38" />
      <path d="M30 44 L70 44" opacity="0.7" />
    </Ink>
    <Ink width={2}>
      <path d="M50 4 L50 0 M30 2 L33 6 M70 2 L67 6" />
    </Ink>
    <Sketch>
      <path d="M24 30 L46 30" />
    </Sketch>
  </ArtCanvas>
);

export const TheSecondEdition = () => (
  <ArtCanvas label="The Second Edition" bg="var(--color-paper-deep)">
    <Ink fill="var(--color-paper)">
      {/* stacked editions with the top one blazing */}
      <path d="M22 44 L78 44 L74 52 L26 52 Z" fill="var(--color-paper-deep)" />
      <path d="M26 34 L74 34 L78 44 L22 44 Z" fill="var(--color-paper-deep)" />
      <path d="M30 14 L70 14 L74 34 L26 34 Z" />
    </Ink>
    <Ink width={2}>
      <path d="M36 22 L64 22 M36 28 L64 28" />
      {/* burst */}
      <path d="M50 6 L50 2 M38 8 L35 4 M62 8 L65 4" />
      <circle cx="50" cy="22" r="1.6" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Ink width={1.8}>
      <path d="M30 38 L70 38" opacity="0.7" />
    </Ink>
    <Sketch>
      <path d="M20 6 L24 10 M80 6 L76 10" />
    </Sketch>
  </ArtCanvas>
);

export const Scribble = () => (
  <ArtCanvas label="Scribble" bg={PAPER}>
    <Ink width={2.4}>
      <path
        d="M34 38 C28 34 32 26 40 24 C36 18 46 12 52 18 C58 12 68 18 64 26 C72 28 72 38 64 40 C60 46 40 46 34 38 Z"
        fill="none"
      />
      <path d="M38 34 C40 30 44 34 46 30 C48 26 52 30 54 32 C56 34 58 32 60 34" fill="none" />
    </Ink>
    <Ink width={2}>
      <circle cx="44" cy="22" r="1.2" fill="var(--color-ink)" stroke="none" />
      <circle cx="52" cy="22" r="1.2" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M28 46 C38 42 52 46 66 42" strokeDasharray="3 3" />
    </Sketch>
  </ArtCanvas>
);

import { ArtCanvas, GroundLine, Hatch, Ink, PAPER, Sketch, Splotch } from "./helpers";

export const DoodledKnight = () => (
  <ArtCanvas label="Doodled Knight" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      <circle cx="50" cy="18" r="6" />
      <path d="M42 46 C42 30 58 30 58 46" />
    </Ink>
    <Ink width={2.4} fill="var(--color-paper-deep)">
      {/* tiny crayon sword + shield */}
      <path d="M58 24 L74 12" />
      <path d="M74 12 L70 20 L76 18 Z" fill="var(--color-ink)" />
      <path d="M36 34 C30 34 28 42 34 46 C40 48 44 42 42 36 Z" />
    </Ink>
    <Sketch>
      <path d="M40 16 C42 14 44 16 46 15" />
    </Sketch>
  </ArtCanvas>
);

export const SmudgeSprite = () => (
  <ArtCanvas label="Smudge Sprite" bg={PAPER}>
    <Ink fill="var(--color-ink)" width={2}>
      <path d="M38 30 C36 22 46 18 52 24 C58 30 54 38 46 38 C40 38 38 36 38 30 Z" stroke="none" />
    </Ink>
    <Ink width={2}>
      <circle cx="44" cy="28" r="1.2" fill="var(--color-paper)" stroke="none" />
      <circle cx="50" cy="28" r="1.2" fill="var(--color-paper)" stroke="none" />
      {/* smudge trail */}
      <path d="M14 44 C24 40 30 44 38 40" opacity="0.5" />
      <path d="M12 50 C22 46 28 50 36 46" opacity="0.35" />
    </Ink>
    <Sketch>
      <path d="M56 44 L66 40 M60 48 L72 46" />
    </Sketch>
  </ArtCanvas>
);

export const CorrectionTape = () => (
  <ArtCanvas label="Correction Tape" bg="var(--color-paper-deep)">
    {/* covered error text */}
    <Sketch>
      <path d="M14 16 L86 16 M14 24 L86 24 M14 32 L60 32" />
    </Sketch>
    <Ink fill="var(--color-paper)">
      <rect x="18" y="34" width="64" height="14" />
    </Ink>
    <Ink width={2.2}>
      {/* tape dispenser */}
      <path d="M34 30 L66 30 L70 44 L30 44 Z" fill="var(--color-paper)" />
      <path d="M42 22 L58 22 L62 30 L38 30 Z" fill="var(--color-paper-deep)" />
    </Ink>
    <Sketch>
      <path d="M22 52 L84 52 M14 40 L16 48" />
    </Sketch>
  </ArtCanvas>
);

export const CarbonCopy = () => (
  <ArtCanvas label="Carbon Copy" bg={PAPER}>
    <Ink width={2} fill="var(--color-paper)">
      <path d="M28 14 L62 14 L62 46 L28 46 Z" />
      <path d="M36 18 L70 18 L70 50 L36 50 Z" fill="var(--color-paper-deep)" />
      <path d="M44 22 L78 22 L78 54 L44 54 Z" fill="var(--color-paper)" />
    </Ink>
    <Sketch>
      <path d="M48 30 L74 30 M48 36 L74 36 M48 42 L66 42" />
    </Sketch>
  </ArtCanvas>
);

export const ClipboardClerk = () => (
  <ArtCanvas label="Clipboard Clerk" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper-deep)">
      <rect x="34" y="12" width="32" height="42" rx="3" />
      <rect x="44" y="9" width="12" height="6" rx="2" fill="var(--color-paper)" />
    </Ink>
    <Ink width={2}>
      <path d="M40 20 L60 20 M40 28 L64 28 M40 36 L58 36" />
      <path d="M40 29 L44 33 L50 26" />
      <path d="M40 37 L44 41 L52 34" />
    </Ink>
    <Ink fill="var(--color-paper)">
      <circle cx="50" cy="0" r="0" />
      <path d="M30 56 C38 50 62 50 70 56" fill="none" />
    </Ink>
  </ArtCanvas>
);

export const MuseOfMargins = () => (
  <ArtCanvas label="Muse of Margins" bg={PAPER}>
    <Sketch>
      <path d="M12 10 L12 54 M88 10 L88 54" />
    </Sketch>
    <Ink fill="var(--color-paper)">
      {/* small muse figure in the margin */}
      <circle cx="18" cy="24" r="5" />
      <path d="M12 44 C12 32 24 32 24 44" />
    </Ink>
    <Ink width={2}>
      {/* whispers */}
      <path d="M26 20 C34 18 40 22 46 20" opacity="0.8" />
      <path d="M26 26 C36 24 44 28 54 26" opacity="0.5" />
      <path d="M26 32 C38 30 48 34 62 32" opacity="0.3" />
    </Ink>
    <Splotch cx={20} cy={48} r={2} opacity={0.7} />
  </ArtCanvas>
);

export const BinderGolem = () => (
  <ArtCanvas label="Binder Golem" bg="var(--color-paper-deep)">
    <GroundLine y={56} />
    <Ink fill="var(--color-paper)">
      {/* binder rings as the head */}
      <path d="M34 12 L38 20 M42 10 L46 20 M50 10 L54 20 M58 12 L62 20" />
      <rect x="30" y="22" width="40" height="30" rx="4" />
    </Ink>
    <Ink width={2}>
      <path d="M36 32 L64 32 M36 40 L64 40" />
      <circle cx="40" cy="16" r="1.2" fill="var(--color-ink)" stroke="none" />
      <circle cx="48" cy="15" r="1.2" fill="var(--color-ink)" stroke="none" />
      <circle cx="56" cy="16" r="1.2" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Hatch x={56} y={28} angle={45} length={18} count={5} width={1.2} />
  </ArtCanvas>
);

export const RazorFold = () => (
  <ArtCanvas label="Razor Fold" bg={PAPER}>
    <Sketch>
      <path d="M8 50 L92 50" strokeDasharray="6 4" />
      <path d="M14 54 L86 54" strokeDasharray="2 4" />
    </Sketch>
    <Ink fill="var(--color-paper)">
      {/* sharp folded blade of paper */}
      <path d="M28 40 L72 14 L78 20 L40 46 Z" />
      <path d="M28 40 L40 46 L36 34 Z" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={2.4}>
      <path d="M72 14 L78 20 L70 22" fill="var(--color-ink)" />
    </Ink>
    <Hatch x={48} y={30} angle={30} length={12} count={3} width={1.1} />
  </ArtCanvas>
);

export const StickerSwarm = () => (
  <ArtCanvas label="Sticker Swarm" bg={PAPER}>
    <GroundLine y={52} />
    {/* peeling stickers flying everywhere */}
    <Ink width={2} fill="var(--color-paper)">
      <path d="M22 24 C22 18 34 18 34 24 C34 30 22 30 22 24 Z" />
      <path d="M52 14 C52 9 62 9 62 14 C62 19 52 19 52 14 Z" />
      <path d="M70 30 C70 25 80 25 80 30 C80 35 70 35 70 30 Z" />
      <path d="M40 36 C40 31 50 31 50 36 C50 41 40 41 40 36 Z" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={1.8}>
      <circle cx="28" cy="24" r="1" fill="var(--color-ink)" stroke="none" />
      <circle cx="57" cy="14" r="1" fill="var(--color-ink)" stroke="none" />
      <circle cx="75" cy="30" r="1" fill="var(--color-ink)" stroke="none" />
      <path d="M46 40 L52 44 M66 34 L60 38" />
    </Ink>
    <Splotch cx={50} cy={50} r={3} opacity={0.85} />
  </ArtCanvas>
);

export const FountainPenDuelist = () => (
  <ArtCanvas label="Fountain Pen Duelist" bg={PAPER}>
    <Sketch>
      <path d="M6 16 h8 M4 22 h10" />
    </Sketch>
    <Ink fill="var(--color-paper)">
      {/* two fencers crossing pens */}
      <circle cx="38" cy="20" r="5.5" />
      <path d="M34 46 C32 32 44 32 42 46" />
      <circle cx="66" cy="20" r="5.5" />
      <path d="M62 46 C60 32 72 32 70 46" />
    </Ink>
    <Ink width={2.6}>
      {/* crossed pens */}
      <path d="M42 26 L62 40" />
      <path d="M62 26 L42 40" />
    </Ink>
    <Ink width={2}>
      <path d="M40 14 L36 10 M64 14 L68 10" />
    </Ink>
  </ArtCanvas>
);

export const StampCollector = () => (
  <ArtCanvas label="Stamp Collector" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      {/* stamp album page */}
      <path d="M22 12 L78 12 L78 50 L22 50 Z" />
    </Ink>
    <Ink width={1.8}>
      {/* perforated stamps */}
      <rect x="28" y="18" width="18" height="22" fill="var(--color-paper-deep)" strokeDasharray="2 2" />
      <rect x="52" y="18" width="18" height="22" fill="var(--color-paper-deep)" strokeDasharray="2 2" />
    </Ink>
    <Ink width={2}>
      <rect x="32" y="23" width="10" height="12" fill="none" />
      <rect x="56" y="23" width="10" height="12" fill="none" />
      <circle cx="37" cy="29" r="1.4" fill="var(--color-ink)" stroke="none" />
      <circle cx="61" cy="29" r="1.4" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M28 44 L72 44" />
    </Sketch>
  </ArtCanvas>
);

export const ThumbtackTitan = () => (
  <ArtCanvas label="Thumbtack Titan" bg="var(--color-paper-deep)">
    <Ink fill="var(--color-paper)">
      {/* giant thumbtack body */}
      <path d="M50 6 C60 6 64 14 60 22 L58 30 L42 30 L40 22 C36 14 40 6 50 6 Z" />
      <path d="M42 30 L58 30 L50 54 Z" />
    </Ink>
    <Ink width={2}>
      <circle cx="45" cy="15" r="1.4" fill="var(--color-ink)" stroke="none" />
      <circle cx="55" cy="15" r="1.4" fill="var(--color-ink)" stroke="none" />
      <path d="M46 19 L54 19" />
    </Ink>
    <Ink width={2.2}>
      {/* pin legs */}
      <path d="M44 54 L40 58 M50 54 L50 58 M56 54 L60 58" />
    </Ink>
    <Hatch x={54} y={34} angle={40} length={12} count={4} width={1.1} />
  </ArtCanvas>
);

export const OrigamiOwl = () => (
  <ArtCanvas label="Origami Owl" bg={PAPER}>
    <Ink fill="var(--color-paper)">
      {/* angular owl */}
      <path d="M50 10 L68 22 L64 48 L36 48 L32 22 Z" />
      <path d="M32 22 L50 34 L68 22" fill="var(--color-paper-deep)" />
      <path d="M42 10 L50 20 L58 10" />
      {/* beak */}
      <path d="M46 30 L50 36 L54 30" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={2}>
      <circle cx="42" cy="26" r="2.2" fill="none" />
      <circle cx="58" cy="26" r="2.2" fill="none" />
      <circle cx="42" cy="26" r="0.9" fill="var(--color-ink)" stroke="none" />
      <circle cx="58" cy="26" r="0.9" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M38 44 L46 44 M54 44 L62 44" />
    </Sketch>
  </ArtCanvas>
);

export const BlotMonster = () => (
  <ArtCanvas label="Blot Monster" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-ink)">
      <path d="M34 26 C30 14 46 8 56 14 C66 8 78 18 72 28 C80 36 74 48 62 48 C56 54 40 54 36 46 C26 44 26 32 34 26 Z" stroke="none" />
    </Ink>
    <Ink width={2}>
      {/* hungry eyes + mouth */}
      <circle cx="46" cy="28" r="1.6" fill="var(--color-paper)" stroke="none" />
      <circle cx="58" cy="28" r="1.6" fill="var(--color-paper)" stroke="none" />
      <path d="M42 38 C48 42 56 42 62 38" stroke="var(--color-paper)" />
      <path d="M46 40 L48 43 M54 41 L56 44" stroke="var(--color-paper)" strokeWidth={1.6} />
    </Ink>
    <Splotch cx={22} cy={50} r={2.4} />
    <Splotch cx={78} cy={52} r={1.8} />
  </ArtCanvas>
);

export const GlueGunGunner = () => (
  <ArtCanvas label="Glue Gun Gunner" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      {/* glue gun body held sideways */}
      <path d="M30 28 L62 24 L66 34 L34 38 Z" />
      <path d="M62 24 L74 20 L76 28 L66 34" fill="var(--color-paper-deep)" />
      <path d="M40 38 L40 46 L50 46 L50 38" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={2.4}>
      {/* glue stream + drip */}
      <path d="M76 24 C84 24 88 28 92 28" />
      <path d="M92 28 C94 30 92 33 90 31" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Ink fill="var(--color-paper)">
      <circle cx="50" cy="16" r="6" />
    </Ink>
    <Ink width={2}>
      <circle cx="48" cy="15" r="1.1" fill="var(--color-ink)" stroke="none" />
      <circle cx="53" cy="15" r="1.1" fill="var(--color-ink)" stroke="none" />
    </Ink>
  </ArtCanvas>
);

export const PaperDolls = () => (
  <ArtCanvas label="Paper Dolls" bg={PAPER}>
    {/* paper doll chain holding hands */}
    <Ink fill="var(--color-paper)">
      <circle cx="26" cy="20" r="6" />
      <circle cx="50" cy="20" r="6" />
      <circle cx="74" cy="20" r="6" />
      <path d="M20 46 C20 32 32 32 32 46 L32 46 M32 46 C32 32 44 32 44 46 M44 46 C44 32 56 32 56 46 M56 46 C56 32 68 32 68 46 M68 46 C68 32 80 32 80 46" fill="none" />
    </Ink>
    <Ink width={2}>
      <circle cx="24" cy="20" r="1" fill="var(--color-ink)" stroke="none" />
      <circle cx="28" cy="20" r="1" fill="var(--color-ink)" stroke="none" />
      <circle cx="48" cy="20" r="1" fill="var(--color-ink)" stroke="none" />
      <circle cx="52" cy="20" r="1" fill="var(--color-ink)" stroke="none" />
      <circle cx="72" cy="20" r="1" fill="var(--color-ink)" stroke="none" />
      <circle cx="76" cy="20" r="1" fill="var(--color-ink)" stroke="none" />
    </Ink>
    <Sketch>
      <path d="M14 52 L86 52" />
    </Sketch>
  </ArtCanvas>
);

export const RubberStampRebel = () => (
  <ArtCanvas label="Rubber Stamp Rebel" bg="var(--color-paper-deep)">
    <GroundLine />
    <Ink fill="var(--color-paper)">
      {/* walking stamp with attitude */}
      <rect x="34" y="26" width="32" height="16" rx="3" />
      <path d="M42 26 L42 16 L58 16 L58 26" fill="var(--color-paper-deep)" />
      <path d="M46 8 L50 14 L54 8" fill="var(--color-paper)" />
    </Ink>
    <Ink width={2.4}>
      {/* rebel legs striding */}
      <path d="M40 42 L34 54 M60 42 L66 54" />
      <path d="M34 54 L28 54 M66 54 L72 54" />
      {/* REJECTED imprint */}
      <path d="M30 12 L46 8" opacity="0.6" />
    </Ink>
    <Ink width={2}>
      <path d="M44 34 L56 34" />
    </Ink>
  </ArtCanvas>
);

export const AccordionFile = () => (
  <ArtCanvas label="Accordion File" bg={PAPER}>
    <GroundLine y={54} />
    <Ink fill="var(--color-paper)">
      {/* accordion pleats */}
      <path d="M22 54 L22 22 L34 30 L46 22 L58 30 L70 22 L82 30 L82 54 Z" />
    </Ink>
    <Ink width={2}>
      <path d="M34 30 L34 54 M46 22 L46 54 M58 30 L58 54 M70 22 L70 54" />
      <circle cx="46" cy="40" r="2" fill="none" />
    </Ink>
    <Sketch>
      <path d="M28 48 L40 48 M40 46 L52 46 M52 48 L64 48" />
    </Sketch>
  </ArtCanvas>
);

export const MimeographMage = () => (
  <ArtCanvas label="Mimeograph Mage" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      {/* robed figure emitting copies */}
      <path d="M44 14 C50 14 54 20 52 26 C56 34 56 46 52 54 L36 54 C32 46 32 34 36 26 C34 20 38 14 44 14 Z" />
      <path d="M40 20 C38 24 38 28 40 30" />
    </Ink>
    <Ink width={2} fill="var(--color-paper)">
      {/* copies drifting out */}
      <path d="M60 22 L74 18 L76 26 L62 30 Z" />
      <path d="M62 36 L78 34 L80 42 L64 44 Z" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={2}>
      <circle cx="43" cy="22" r="1.2" fill="var(--color-ink)" stroke="none" />
      <circle cx="47" cy="22" r="1.2" fill="var(--color-ink)" stroke="none" />
      <path d="M50 28 C56 26 58 28 60 26" opacity="0.7" />
    </Ink>
  </ArtCanvas>
);

export const RulerRegent = () => (
  <ArtCanvas label="Ruler Regent" bg="var(--color-paper-deep)">
    <GroundLine y={56} />
    <Ink fill="var(--color-paper)">
      {/* crowned ruler */}
      <rect x="38" y="14" width="24" height="40" />
      <path d="M38 20 L62 20" />
      {/* crown */}
      <path d="M42 14 L42 8 L46 12 L50 6 L54 12 L58 8 L58 14" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={1.8}>
      <path d="M42 26 L58 26 M42 32 L58 32 M42 38 L58 38 M42 44 L58 44" />
      <path d="M46 26 L46 32 M54 32 L54 38" />
    </Ink>
    <Sketch>
      <path d="M30 10 L36 14 M70 10 L64 14" />
    </Sketch>
  </ArtCanvas>
);

export const ScotchGuard = () => (
  <ArtCanvas label="Scotch Guard" bg={PAPER}>
    <GroundLine />
    <Ink fill="var(--color-paper)">
      {/* tape-dispenser guard with shield */}
      <path d="M34 16 C34 10 50 10 50 16 L50 18 L34 18 Z" />
      <path d="M30 18 L54 18 L52 30 L32 30 Z" />
      <path d="M40 30 L44 50 M48 30 L48 50" />
      {/* shield in front */}
      <path d="M62 24 C72 28 74 30 73 38 C72 46 66 52 62 55 C58 52 52 46 51 38 C50 30 52 28 62 24 Z" fill="var(--color-paper-deep)" />
    </Ink>
    <Ink width={2}>
      <path d="M58 38 L66 38 M62 34 L62 42" />
      <path d="M36 14 L48 14" />
    </Ink>
    <Hatch x={66} y={34} angle={45} length={10} count={3} width={1.1} />
  </ArtCanvas>
);

export const TheEraserOfEnds = () => (
  <ArtCanvas label="The Eraser of Ends" bg="var(--color-paper-deep)">
    <Ink fill="var(--color-paper)">
      {/* colossal eraser figure */}
      <path d="M30 50 L30 24 C30 16 40 12 50 12 C60 12 70 16 70 24 L70 50 Z" />
      <path d="M30 32 L70 32" />
    </Ink>
    <Ink width={2.4}>
      {/* glowing void eyes */}
      <circle cx="42" cy="24" r="2.4" fill="var(--color-ink)" stroke="none" />
      <circle cx="58" cy="24" r="2.4" fill="var(--color-ink)" stroke="none" />
      <path d="M40 42 L46 38 M54 38 L60 42" />
    </Ink>
    {/* erased world below */}
    <Sketch>
      <path d="M12 56 L36 56 M44 56 L60 56 M68 56 L90 56" strokeDasharray="1 5" />
    </Sketch>
    <Ink width={2}>
      <path d="M20 20 L28 14 M80 20 L72 14" opacity="0.6" />
    </Ink>
  </ArtCanvas>
);

export const TheOverflowingInkwell = () => (
  <ArtCanvas label="The Overflowing Inkwell" bg={PAPER}>
    <Ink fill="var(--color-ink)">
      {/* overflowing ink pool */}
      <path d="M14 46 C14 40 26 38 34 40 C40 34 60 34 66 40 C74 38 86 40 86 46 C86 54 70 56 50 56 C30 56 14 54 14 46 Z" stroke="none" />
    </Ink>
    <Ink fill="var(--color-paper)">
      {/* the well itself, tipped */}
      <path d="M40 22 C36 28 40 34 50 34 C60 34 64 28 60 22 Z" />
      <ellipse cx="50" cy="22" rx="10" ry="3" />
    </Ink>
    <Ink width={2.2}>
      {/* ink surging up from the well */}
      <path d="M50 18 C50 10 44 8 46 2" fill="none" />
      <Splotch cx={46} cy={2} r={2.4} />
      <Splotch cx={28} cy={34} r={2} />
      <Splotch cx={74} cy={36} r={2.4} />
    </Ink>
    <Sketch>
      <path d="M20 20 C24 16 28 18 32 14" />
    </Sketch>
  </ArtCanvas>
);

export const TheCollectedWorks = () => (
  <ArtCanvas label="The Collected Works" bg="var(--color-paper-deep)">
    <GroundLine y={56} />
    <Ink fill="var(--color-paper)">
      {/* grand shelf of tomes */}
      <rect x="24" y="18" width="12" height="36" />
      <rect x="38" y="24" width="10" height="30" />
      <rect x="50" y="14" width="12" height="40" />
      <path d="M64 20 L72 18 L78 50 L70 54 Z" />
    </Ink>
    <Ink width={2}>
      <path d="M28 24 L34 24 M53 20 L59 20 M53 28 L59 28 M68 26 L74 24" />
      <path d="M22 54 L84 54" />
    </Ink>
    <Sketch>
      <path d="M28 30 L34 30 M28 36 L34 36 M42 32 L46 32" />
    </Sketch>
    <Splotch cx={80} cy={14} r={1.8} opacity={0.7} />
  </ArtCanvas>
);

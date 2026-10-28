import type { ComponentType } from "react";
import { createElement } from "react";
import * as A from "./art-units-a";
import * as B from "./art-units-b";
import * as S from "./art-spells";
import * as L from "./art-legendaries";
import * as X from "./art-expansion";
import * as W3U from "./art-wave3-units";
import * as W3S from "./art-wave3-spells";

/**
 * Registry of per-card illustrations. Every card id in src/game/cards.ts
 * must have an entry — CardArt throws in development if one is missing.
 */
export type ArtComponent = ComponentType;

export const ART_REGISTRY: Record<string, ArtComponent> = {
  // units a
  ink_blot: A.InkBlot,
  paper_swan: A.PaperSwan,
  apprentice_scribe: A.ApprenticeScribe,
  origami_crane: A.OrigamiCrane,
  graphite_golem: A.GraphiteGolem,
  page_knight: A.PageKnight,
  inkwell_imp: A.InkwellImp,
  quill_sergeant: A.QuillSergeant,
  fountain_pen_fencer: A.FountainPenFencer,
  papercraft_colossus: A.PapercraftColossus,
  eraser_golem: A.EraserGolem,
  stencil_archer: A.StencilArcher,
  blotting_wall: A.BlottingWall,
  ink_mage: A.InkMage,
  // units b
  the_calligrapher: B.TheCalligrapher,
  comic_relief: B.ComicRelief,
  sketch_sentinel: B.SketchSentinel,
  paper_dragon: B.PaperDragon,
  origami_phoenix: B.OrigamiPhoenix,
  archivists_aide: B.ArchivistsAide,
  stationery_titan: B.StationeryTitan,
  // spells
  red_pen: S.RedPen,
  crumpled_note: S.CrumpledNote,
  fresh_ink: S.FreshInk,
  blank_page: S.BlankPage,
  second_draft: S.SecondDraft,
  paper_cut: S.PaperCut,
  sharpened_pencil: S.SharpenedPencil,
  lamination: S.Lamination,
  pressure_stamp: S.PressureStamp,
  paper_storm: S.PaperStorm,
  editors_verdict: S.EditorsVerdict,
  acceptance_stamp: S.AcceptanceStamp,
  the_final_draft: S.TheFinalDraft,
  foreword: S.Foreword,
  blot_out: S.BlotOut,
  // legendaries
  the_living_manuscript: L.TheLivingManuscript,
  the_grand_palimpsest: L.TheGrandPalimpsest,
  the_archivist: L.TheArchivist,
  the_unwritten: L.TheUnwritten,
  // second wave
  marginalia: X.Marginalia,
  paper_airplane: X.PaperAirplane,
  inkwell_serpent: X.InkwellSerpent,
  glue_stick: X.GlueStick,
  wax_seal_warden: X.WaxSealWarden,
  typewriter_terror: X.TypewriterTerror,
  sticky_note: X.StickyNote,
  laminated_legend: X.LaminatedLegend,
  the_red_thesaurus: X.TheRedThesaurus,
  doodle: X.Doodle,
  second_wind: X.SecondWind,
  margin_call: X.MarginCall,
  plot_twist: X.PlotTwist,
  fresh_page: X.FreshPage,
  ink_wash: X.InkWash,
  the_second_printing: X.TheSecondPrinting,
  // wave 3 — The Archive Set
  doodled_knight: W3U.DoodledKnight,
  smudge_sprite: W3U.SmudgeSprite,
  correction_tape: W3U.CorrectionTape,
  carbon_copy: W3U.CarbonCopy,
  clipboard_clerk: W3U.ClipboardClerk,
  muse_of_margins: W3U.MuseOfMargins,
  binder_golem: W3U.BinderGolem,
  razor_fold: W3U.RazorFold,
  sticker_swarm: W3U.StickerSwarm,
  fountain_pen_duelist: W3U.FountainPenDuelist,
  stamp_collector: W3U.StampCollector,
  thumbtack_titan: W3U.ThumbtackTitan,
  origami_owl: W3U.OrigamiOwl,
  blot_monster: W3U.BlotMonster,
  glue_gun_gunner: W3U.GlueGunGunner,
  paper_dolls: W3U.PaperDolls,
  rubber_stamp_rebel: W3U.RubberStampRebel,
  accordion_file: W3U.AccordionFile,
  mimeograph_mage: W3U.MimeographMage,
  ruler_regent: W3U.RulerRegent,
  scotch_guard: W3U.ScotchGuard,
  the_eraser_of_ends: W3U.TheEraserOfEnds,
  the_overflowing_inkwell: W3U.TheOverflowingInkwell,
  the_collected_works: W3U.TheCollectedWorks,
  ink_drop: W3S.InkDrop,
  sticky_situation: W3S.StickySituation,
  brainstorm: W3S.Brainstorm,
  paper_trail: W3S.PaperTrail,
  erase_and_redraw: W3S.EraseAndRedraw,
  wax_seal: W3S.WaxSeal,
  paper_shredder: W3S.PaperShredder,
  red_letter_day: W3S.RedLetterDay,
  fools_cap: W3S.FoolsCap,
  wide_margin_victory: W3S.WideMarginVictory,
  reinforced_margins: W3S.ReinforcedMargins,
  signing_bonus: W3S.SigningBonus,
  the_long_letter: W3S.TheLongLetter,
  red_ink_flood: W3S.RedInkFlood,
  final_notice: W3S.FinalNotice,
  the_second_edition: W3S.TheSecondEdition,
  scribble: W3S.Scribble,
  // tokens
  ash_wing: S.AshWing,
  ghost_text: S.GhostText,
  ink_golem: S.InkGolem,
  tempo_token: S.TempoToken,
};

const Unknown: ArtComponent = () => {
  if (process.env.NODE_ENV === "development") {
    console.warn("CardArt: missing illustration for a card id");
  }
  return (
    <ArtCanvas label="Unillustrated card">
      <Ink>
        <rect x="30" y="18" width="40" height="30" rx="4" strokeDasharray="5 4" />
        <path d="M30 18 L70 48 M70 18 L30 48" opacity="0.4" />
      </Ink>
    </ArtCanvas>
  );
};

export function getArt(id: string): ArtComponent {
  return ART_REGISTRY[id] ?? Unknown;
}

export function CardArt({ id }: { id: string }) {
  // createElement keeps this a value lookup, not a component definition at render time
  return createElement(getArt(id));
}

// re-exports so consumers only import from this module
import { ArtCanvas, GroundLine, Hatch, Ink, Sketch, Splotch } from "./helpers";
export { ArtCanvas, GroundLine, Hatch, Ink, Sketch, Splotch };

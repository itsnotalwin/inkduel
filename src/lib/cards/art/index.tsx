import type { ComponentType } from "react";
import { createElement } from "react";
import * as A from "./art-units-a";
import * as B from "./art-units-b";
import * as S from "./art-spells";
import * as L from "./art-legendaries";
import * as X from "./art-expansion";

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

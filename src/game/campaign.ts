/**
 * The Archive Campaign — a 12-stage PvE ladder. Each stage is a fixed
 * opponent deck + AI policy; beating a stage for the first time grants its
 * coin reward (and milestones 4/8/12 grant a specific card).
 * Pure data — shared by the client (duel mode) and the server (validation).
 */
import type { PolicyKey } from "./ai";

export interface CampaignStage {
  index: number; // 0-based
  name: string;
  blurb: string;
  policy: PolicyKey;
  deck: [string, number][];
  rewardCoins: number;
  /** Card granted on first clear, for milestone stages. */
  rewardCard?: string;
}

export const CAMPAIGN_STAGES: CampaignStage[] = [
  {
    index: 0,
    name: "The Doodler",
    blurb: "Armed with a blunt pencil and endless optimism.",
    policy: "duelist",
    rewardCoins: 50,
    deck: [
      ["paper_swan", 2], ["ink_blot", 2], ["ink_drop", 2], ["paper_airplane", 2],
      ["smudge_sprite", 2], ["doodled_knight", 2], ["marginalia", 2], ["second_wind", 2],
      ["sticky_situation", 2], ["doodle", 2],
    ],
  },
  {
    index: 1,
    name: "Smudge Squadron",
    blurb: "Fast, folded, and gone before you can read them.",
    policy: "duelist",
    rewardCoins: 60,
    deck: [
      ["origami_crane", 2], ["paper_airplane", 2], ["smudge_sprite", 2],
      ["fountain_pen_fencer", 2], ["razor_fold", 2], ["paper_dragon", 1],
      ["red_pen", 2], ["ink_drop", 2], ["marginalia", 2], ["sharpened_pencil", 1],
      ["paper_cut", 2],
    ],
  },
  {
    index: 2,
    name: "The Clipboard Clerk",
    blurb: "Has a form for everything. Including your defeat.",
    policy: "collector",
    rewardCoins: 70,
    deck: [
      ["clipboard_clerk", 2], ["carbon_copy", 2], ["stamp_collector", 2],
      ["sketch_sentinel", 2], ["blank_page", 2], ["fresh_ink", 2], ["glue_stick", 2],
      ["second_draft", 2], ["the_final_draft", 1], ["pressure_stamp", 2], ["blot_out", 1],
    ],
  },
  {
    index: 3,
    name: "Sticky Situations",
    blurb: "Everything here is glued, taped, and very hard to remove.",
    policy: "collector",
    rewardCoins: 80,
    rewardCard: "glue_gun_gunner",
    deck: [
      ["sticky_situation", 2], ["glue_stick", 2], ["glue_gun_gunner", 2], ["sticky_note", 2],
      ["blotting_wall", 2], ["foreword", 1], ["doodle", 2], ["second_wind", 2],
      ["page_knight", 2], ["stationery_titan", 2], ["fresh_page", 1],
    ],
  },
  {
    index: 4,
    name: "The Paper Fleet",
    blurb: "A thousand folds, launched in formation.",
    policy: "duelist",
    rewardCoins: 90,
    deck: [
      ["origami_crane", 2], ["paper_swan", 2], ["paper_airplane", 2], ["paper_dragon", 2],
      ["razor_fold", 2], ["fountain_pen_fencer", 2], ["the_red_thesaurus", 1],
      ["red_pen", 2], ["paper_cut", 2], ["sharpened_pencil", 1], ["crumpled_note", 2],
    ],
  },
  {
    index: 5,
    name: "Inkwell Serpents",
    blurb: "The well is deep, the fangs are wet, the wall is long.",
    policy: "archivist",
    rewardCoins: 100,
    deck: [
      ["inkwell_serpent", 2], ["page_knight", 2], ["blotting_wall", 2], ["binder_golem", 2],
      ["correction_tape", 2], ["lamination", 2], ["the_living_manuscript", 1],
      ["eraser_golem", 2], ["sticky_note", 2], ["fresh_page", 1], ["second_wind", 2],
    ],
  },
  {
    index: 6,
    name: "The Collector's Apprentice",
    blurb: "Learns fast. Draws faster.",
    policy: "collector",
    rewardCoins: 110,
    deck: [
      ["apprentice_scribe", 2], ["quill_sergeant", 2], ["the_calligrapher", 1],
      ["stamp_collector", 2], ["carbon_copy", 2], ["muse_of_margins", 2],
      ["blank_page", 2], ["fresh_page", 2], ["the_final_draft", 1],
      ["pressure_stamp", 1], ["editors_verdict", 2], ["the_second_printing", 1],
    ],
  },
  {
    index: 7,
    name: "Wax & Seals",
    blurb: "Everything here is twice signed and twice striking.",
    policy: "archivist",
    rewardCoins: 120,
    rewardCard: "rubber_stamp_rebel",
    deck: [
      ["wax_seal", 2], ["wax_seal_warden", 2], ["rubber_stamp_rebel", 2],
      ["acceptance_stamp", 2], ["pressure_stamp", 2], ["eraser_golem", 2],
      ["sticky_note", 2], ["margin_call", 2], ["signing_bonus", 1],
      ["second_wind", 2], ["the_eraser_of_ends", 1],
    ],
  },
  {
    index: 8,
    name: "The Typewriter Cabal",
    blurb: "Clack. Clack. Clack. That is the sound of your board dying.",
    policy: "collector",
    rewardCoins: 130,
    deck: [
      ["typewriter_terror", 2], ["paper_dolls", 2], ["mimeograph_mage", 2],
      ["the_second_printing", 2], ["comic_relief", 2], ["the_calligrapher", 1],
      ["doodle", 2], ["plot_twist", 2], ["the_long_letter", 2],
      ["glue_gun_gunner", 2], ["the_final_draft", 1],
    ],
  },
  {
    index: 9,
    name: "Red Ink Brigade",
    blurb: "They grade on a curve. The curve is a blade.",
    policy: "duelist",
    rewardCoins: 140,
    deck: [
      ["red_pen", 2], ["paper_cut", 2], ["red_letter_day", 2], ["red_ink_flood", 1],
      ["blot_out", 2], ["ink_wash", 2], ["acceptance_stamp", 2], ["final_notice", 1],
      ["plot_twist", 1], ["paper_shredder", 2], ["the_red_thesaurus", 1],
      ["fountain_pen_fencer", 2],
    ],
  },
  {
    index: 10,
    name: "The Grand Archive",
    blurb: "Everything ever written, arranged against you by subject.",
    policy: "archivist",
    rewardCoins: 150,
    deck: [
      ["the_archivist", 1], ["the_grand_palimpsest", 1], ["the_living_manuscript", 1],
      ["mimeograph_mage", 2], ["the_second_printing", 2], ["the_long_letter", 2],
      ["blank_page", 2], ["fresh_page", 2], ["ink_wash", 2], ["blot_out", 2],
      ["sticky_note", 2], ["the_collected_works", 1],
    ],
  },
  {
    index: 11,
    name: "THE HEAD ARCHIVIST",
    blurb: "Knows where everything is. Including where you end.",
    policy: "archivist",
    rewardCoins: 200,
    rewardCard: "the_collected_works",
    deck: [
      ["the_archivist", 1], ["the_eraser_of_ends", 1], ["the_collected_works", 1],
      ["the_overflowing_inkwell", 1], ["the_grand_palimpsest", 1],
      ["the_living_manuscript", 1], ["the_unwritten", 1], ["blot_out", 2],
      ["ink_wash", 2], ["paper_shredder", 2], ["editors_verdict", 2],
      ["lamination", 2], ["stationery_titan", 2], ["margin_call", 1],
    ],
  },
];

export const CAMPAIGN_PACKS_COST = 100; // coins per card pack

export function campaignStage(index: number): CampaignStage | undefined {
  return CAMPAIGN_STAGES.find((s) => s.index === index);
}

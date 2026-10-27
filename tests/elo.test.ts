import { describe, expect, it } from "vitest";
import { eloDelta } from "@/lib/elo";
import { nextRank, rankFor } from "@/config";

describe("elo", () => {
  it("equal ratings: win = +16, loss = −16, draw = 0", () => {
    expect(eloDelta(1000, 1000, "WIN").delta).toBe(16);
    expect(eloDelta(1000, 1000, "LOSS").delta).toBe(-16);
    expect(eloDelta(1000, 1000, "DRAW").delta).toBe(0);
  });

  it("beating a much stronger opponent pays out ~+29", () => {
    expect(eloDelta(1000, 1400, "WIN").delta).toBe(29);
    expect(eloDelta(1000, 1400, "WIN").newMmr).toBe(1029);
  });

  it("losing to a much stronger opponent costs almost nothing", () => {
    expect(eloDelta(1000, 1400, "LOSS").delta).toBe(-3);
  });

  it("is symmetric", () => {
    const a = eloDelta(1200, 1300, "WIN").delta;
    const b = eloDelta(1300, 1200, "LOSS").delta;
    expect(a).toBe(-b);
  });
});

describe("ranks", () => {
  it("maps MMR to rank thresholds", () => {
    expect(rankFor(900).key).toBe("wood");
    expect(rankFor(1000).key).toBe("bronze");
    expect(rankFor(1250).key).toBe("silver");
    expect(rankFor(1450).key).toBe("gold");
    expect(rankFor(1700).key).toBe("platinum");
    expect(rankFor(1850).key).toBe("obsidian");
    expect(rankFor(2100).key).toBe("ink-master");
  });

  it("computes the next rank", () => {
    expect(nextRank(1150)?.key).toBe("silver");
    expect(nextRank(2000)).toBeNull();
  });
});

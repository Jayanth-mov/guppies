import { describe, expect, it } from "vitest";
import {
  SPECIES,
  bandSpans,
  depthFor,
  formatRange,
  speciesFor,
  widthFor,
} from "./species";

describe("species tiers", () => {
  it("covers 0 to Infinity contiguously", () => {
    expect(SPECIES[0].min).toBe(0);
    expect(SPECIES[SPECIES.length - 1].max).toBe(Infinity);
    for (let i = 0; i < SPECIES.length - 1; i++) {
      expect(SPECIES[i].max).toBe(SPECIES[i + 1].min);
    }
  });

  it("locks size to species, monotonically increasing", () => {
    for (let i = 1; i < SPECIES.length; i++) {
      expect(SPECIES[i].width).toBeGreaterThan(SPECIES[i - 1].width);
    }
  });

  it("treats upper bounds as exclusive", () => {
    expect(speciesFor(0).name).toBe("Guppy");
    expect(speciesFor(1_999).name).toBe("Guppy");
    expect(speciesFor(2_000).name).toBe("Clownfish");
    expect(speciesFor(4_999).name).toBe("Clownfish");
    expect(speciesFor(5_000).name).toBe("Goldfish");
    expect(speciesFor(9_999).name).toBe("Goldfish");
    expect(speciesFor(10_000).name).toBe("Rainbow trout");
    expect(speciesFor(14_999).name).toBe("Rainbow trout");
    expect(speciesFor(15_000).name).toBe("Sockeye salmon");
    expect(speciesFor(19_999).name).toBe("Sockeye salmon");
    expect(speciesFor(20_000).name).toBe("Atlantic cod");
    expect(speciesFor(24_999).name).toBe("Atlantic cod");
    expect(speciesFor(25_000).name).toBe("Ocean sunfish");
    expect(speciesFor(34_999).name).toBe("Ocean sunfish");
    expect(speciesFor(35_000).name).toBe("Swordfish");
    expect(speciesFor(49_999).name).toBe("Swordfish");
    expect(speciesFor(50_000).name).toBe("Giant manta ray");
    expect(speciesFor(74_999).name).toBe("Giant manta ray");
    expect(speciesFor(75_000).name).toBe("Great white shark");
    expect(speciesFor(99_999).name).toBe("Great white shark");
    expect(speciesFor(100_000).name).toBe("Basking shark");
    expect(speciesFor(249_999).name).toBe("Basking shark");
    expect(speciesFor(250_000).name).toBe("Whale shark");
    expect(speciesFor(5_000_000).name).toBe("Whale shark");
  });
});

describe("depth", () => {
  it("clamps at the surface and the seabed", () => {
    expect(depthFor(0)).toBe(0);
    expect(depthFor(100)).toBe(0);
    expect(depthFor(1_000_000)).toBe(1);
    expect(depthFor(9_999_999)).toBe(1);
  });

  it("is continuous and monotonic, not band-snapped", () => {
    const counts = [150, 890, 1_450, 2_100, 4_800, 9_100, 27_600, 84_200, 312_000];
    for (let i = 1; i < counts.length; i++) {
      expect(depthFor(counts[i])).toBeGreaterThan(depthFor(counts[i - 1]));
    }
    // same band, different depths
    expect(depthFor(4_800)).toBeGreaterThan(depthFor(2_100));
  });

  it("gives every band an equal slice of the ocean", () => {
    for (let i = 0; i < SPECIES.length; i++) {
      expect(depthFor(SPECIES[i].min)).toBeCloseTo(i / SPECIES.length, 10);
    }
  });
});

describe("size within species", () => {
  it("is monotone in follower count, including across tier boundaries", () => {
    const counts = [
      0, 500, 1_999, 2_000, 4_999, 5_000, 9_999, 10_000, 14_999, 15_000,
      19_999, 20_000, 24_999, 25_000, 34_999, 35_000, 49_999, 50_000, 74_999,
      75_000, 99_999, 100_000, 249_999, 250_000, 600_000, 1_000_000,
    ];
    for (let i = 1; i < counts.length; i++) {
      expect(widthFor(counts[i])).toBeGreaterThan(widthFor(counts[i - 1]));
    }
  });

  it("shows a clear difference across a species' own range", () => {
    // top of the clownfish range at least ~20% bigger than the bottom
    expect(widthFor(4_999) / widthFor(2_000)).toBeGreaterThan(1.2);
  });

  it("never lets a species outgrow the next tier's runt", () => {
    for (let i = 0; i < SPECIES.length - 1; i++) {
      const biggest = widthFor(SPECIES[i].max - 1);
      const nextSmallest = widthFor(SPECIES[i + 1].min);
      expect(biggest).toBeLessThan(nextSmallest);
    }
  });
});

describe("band spans", () => {
  it("tiles the ocean exactly from 0 to 1", () => {
    const spans = bandSpans();
    expect(spans).toHaveLength(12);
    expect(spans[0].top).toBe(0);
    expect(spans[spans.length - 1].bottom).toBe(1);
    for (let i = 0; i < spans.length - 1; i++) {
      expect(spans[i].bottom).toBeCloseTo(spans[i + 1].top, 10);
    }
  });
});

describe("range labels", () => {
  it("formats closed and open ranges", () => {
    expect(formatRange(SPECIES[0])).toBe("0 – 1,999");
    expect(formatRange(SPECIES[11])).toBe("250,000+");
  });
});

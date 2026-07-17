export interface Species {
  name: string;
  symbolId: string;
  min: number; // inclusive
  max: number; // exclusive; Infinity for the deepest tier
  width: number; // rendered width in px at desktop scale — locked per species, never per count
}

export const SPECIES: Species[] = [
  { name: "Guppy", symbolId: "guppy", min: 0, max: 2_000, width: 34 },
  { name: "Clownfish", symbolId: "clownfish", min: 2_000, max: 5_000, width: 46 },
  { name: "Goldfish", symbolId: "goldfish", min: 5_000, max: 10_000, width: 56 },
  { name: "Rainbow trout", symbolId: "trout", min: 10_000, max: 15_000, width: 74 },
  { name: "Sockeye salmon", symbolId: "sockeye", min: 15_000, max: 20_000, width: 84 },
  { name: "Atlantic cod", symbolId: "cod", min: 20_000, max: 25_000, width: 96 },
  { name: "Ocean sunfish", symbolId: "sunfish", min: 25_000, max: 35_000, width: 112 },
  { name: "Swordfish", symbolId: "swordfish", min: 35_000, max: 50_000, width: 150 },
  { name: "Giant manta ray", symbolId: "manta", min: 50_000, max: 75_000, width: 185 },
  { name: "Great white shark", symbolId: "greatwhite", min: 75_000, max: 100_000, width: 210 },
  { name: "Basking shark", symbolId: "basking", min: 100_000, max: 250_000, width: 250 },
  { name: "Whale shark", symbolId: "whaleshark", min: 250_000, max: Infinity, width: 300 },
];

export const BAND_COLORS = [
  "#bfe6f5",
  "#a5daf0",
  "#8acdea",
  "#6fbee3",
  "#56aeda",
  "#3f9bce",
  "#2e86be",
  "#2270a8",
  "#1a5b8e",
  "#144773",
  "#0e3358",
  "#08203c",
];

// 0-based band index at which ink flips from dark navy to pale.
export const INK_FLIP_INDEX = 6;

export function paleInk(speciesIndex: number): boolean {
  return speciesIndex >= INK_FLIP_INDEX;
}

export function speciesIndexFor(count: number): number {
  for (let i = SPECIES.length - 1; i >= 0; i--) {
    if (count >= SPECIES[i].min) return i;
  }
  return 0;
}

export function speciesFor(count: number): Species {
  return SPECIES[speciesIndexFor(count)];
}

// Depth is continuous — never snapped to the band. Each of the 12 bands gets
// an equal slice of the ocean (a pure log scale gave the guppy shallows a
// third of the water column), and a fish's position inside its band is the
// log-interpolated position within that species' follower range. A 4.8k
// clownfish still sits visibly deeper than a 2.1k one.
export const DEPTH_FLOOR = 100; // counts at or below this pin to the band top
export const DEPTH_CEIL = 1_000_000; // counts at or above this pin to the seabed

/** 0 = top of the species' band, 1 = bottom, log-interpolated. */
function bandT(count: number, index: number): number {
  const s = SPECIES[index];
  const lo = Math.log10(s.min > 0 ? s.min : DEPTH_FLOOR);
  const hi = Math.log10(s.max === Infinity ? DEPTH_CEIL : s.max);
  const c = Math.log10(Math.max(count, DEPTH_FLOOR));
  return Math.min(1, Math.max(0, (c - lo) / (hi - lo)));
}

/** 0 = surface, 1 = seabed. */
export function depthFor(count: number): number {
  const i = speciesIndexFor(count);
  return (i + bandT(count, i)) / SPECIES.length;
}

// Size scales gently within a species: a 4.9k clownfish is clearly bigger
// than a 2.0k one, but never bigger than the runtiest goldfish. Boundary
// widths sit at the geometric mean of neighboring species' nominal widths,
// with a 6% step across each boundary so species identity keeps a size gap.
const WIDTH_BOUNDS: number[] = (() => {
  const w = SPECIES.map((s) => s.width);
  const b = [w[0] * 0.82];
  for (let i = 1; i < w.length; i++) b.push(Math.sqrt(w[i - 1] * w[i]));
  b.push(w[w.length - 1] * 1.15);
  return b;
})();

/** Rendered width in px at desktop scale, monotone in follower count. */
export function widthFor(count: number): number {
  const i = speciesIndexFor(count);
  const lo = WIDTH_BOUNDS[i] * 1.03;
  const hi = WIDTH_BOUNDS[i + 1] * 0.97;
  return lo + (hi - lo) * bandT(count, i);
}

export interface BandSpan {
  species: Species;
  index: number;
  top: number; // fraction of ocean height, 0..1
  bottom: number;
  color: string;
  pale: boolean; // whether labels on this band use pale ink
}

// The bands are labels painted on the wall: each spans from the depth of its
// own minimum to the depth of the next band's minimum. Log scale means the
// heights vary — that's honest, not a bug.
export function bandSpans(): BandSpan[] {
  return SPECIES.map((species, i) => ({
    species,
    index: i,
    top: i === 0 ? 0 : depthFor(species.min),
    bottom: i === SPECIES.length - 1 ? 1 : depthFor(SPECIES[i + 1].min),
    color: BAND_COLORS[i],
    pale: paleInk(i),
  }));
}

const nf = new Intl.NumberFormat("en-US");

export function formatCount(n: number): string {
  return nf.format(n);
}

export function formatRange(s: Species): string {
  if (s.max === Infinity) return `${nf.format(s.min)}+`;
  return `${nf.format(s.min)} – ${nf.format(s.max - 1)}`;
}

// Flavor for the depth gauge: the ocean maps to a fictional 0–4,000 m water column.
export const GAUGE_MAX_METERS = 4000;

export function metersFor(depth: number): number {
  return Math.round(depth * GAUGE_MAX_METERS);
}

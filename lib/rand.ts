// Deterministic pseudo-randomness keyed by string, so the server and client
// render identical drift lanes, phases, and particle fields (no hydration
// mismatch, no Math.random() in render).

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded RNG for a given key. Same key → same sequence, everywhere. */
export function rng(key: string): () => number {
  return mulberry32(hashString(key));
}

/** Uniform pick in [lo, hi) from a generator. */
export function pick(r: () => number, lo: number, hi: number): number {
  return lo + r() * (hi - lo);
}

"use client";

import type { CSSProperties } from "react";
import { pick, rng } from "@/lib/rand";
import styles from "./Atmosphere.module.css";

// Ambient depth-zone effects: caustics + godrays + bubbles in the shallows,
// drifting particles in midwater, marine snow and bioluminescent specks in the
// abyss, all under a depth vignette. Everything is seeded (no Math.random in
// render). Motion is pure transform/opacity so it composites on the GPU.

type Style = Record<string, string | number>;

interface Particle {
  key: number;
  style: CSSProperties;
}

function makeParticles(
  seed: string,
  count: number,
  build: (r: () => number, i: number) => Style,
): Particle[] {
  const r = rng(seed);
  return Array.from({ length: count }, (_, i) => ({
    key: i,
    style: build(r, i) as CSSProperties,
  }));
}

// parallax tier: far particles are small, dim, slow and softly blurred; near
// ones are big, bright, quick and a touch out of focus
function tier(r: () => number): {
  sizeMul: number;
  blur: number;
  op: number;
  speed: number;
} {
  return [
    { sizeMul: 0.55, blur: 0.6, op: 0.28, speed: 1.55 },
    { sizeMul: 1.0, blur: 0, op: 0.55, speed: 1.0 },
    { sizeMul: 1.75, blur: 1.4, op: 0.85, speed: 0.68 },
  ][Math.floor(pick(r, 0, 3))];
}

const RAYS = makeParticles("godrays", 5, (r, i) => ({
  left: `${(3 + i * 19 + pick(r, 0, 10)).toFixed(1)}%`,
  width: `${pick(r, 130, 260).toFixed(0)}px`,
  height: `${pick(r, 900, 1500).toFixed(0)}px`,
  animationDuration: `${pick(r, 13, 23).toFixed(1)}s`,
  animationDelay: `${-pick(r, 0, 16).toFixed(1)}s`,
  "--drift": `${pick(r, 22, 64).toFixed(0)}px`,
}));

const BUBBLES = makeParticles("bubbles", 20, (r) => {
  const t = tier(r);
  const size = (pick(r, 4, 8) * t.sizeMul).toFixed(1);
  return {
    left: `${pick(r, 3, 94).toFixed(1)}%`,
    top: `${pick(r, 2, 27).toFixed(2)}%`,
    width: `${size}px`,
    height: `${size}px`,
    filter: `blur(${t.blur}px)`,
    animationDuration: `${(pick(r, 9, 15) * t.speed).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 16).toFixed(1)}s`,
    "--maxop": t.op,
  };
});

const MOTES = makeParticles("motes", 22, (r) => {
  const t = tier(r);
  const size = (pick(r, 2, 3.5) * t.sizeMul).toFixed(1);
  return {
    left: `${pick(r, 2, 96).toFixed(1)}%`,
    top: `${pick(r, 33, 58).toFixed(2)}%`,
    width: `${size}px`,
    height: `${size}px`,
    filter: `blur(${t.blur}px)`,
    opacity: t.op * 0.8,
    animationDuration: `${(pick(r, 18, 36) * t.speed).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 30).toFixed(1)}s`,
  };
});

const SNOW = makeParticles("snow", 30, (r) => {
  const t = tier(r);
  const size = (pick(r, 1.5, 3) * t.sizeMul).toFixed(1);
  return {
    left: `${pick(r, 2, 97).toFixed(1)}%`,
    top: `${pick(r, 62, 97).toFixed(2)}%`,
    width: `${size}px`,
    height: `${size}px`,
    filter: `blur(${t.blur}px)`,
    animationDuration: `${(pick(r, 16, 32) * t.speed).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 30).toFixed(1)}s`,
    "--maxop": t.op * 0.75,
  };
});

const SPECKS = makeParticles("specks", 16, (r) => {
  const size = pick(r, 2, 3.2).toFixed(1);
  return {
    left: `${pick(r, 3, 95).toFixed(1)}%`,
    top: `${pick(r, 72, 99).toFixed(2)}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${pick(r, 3, 8).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 8).toFixed(1)}s`,
  };
});

// A rippling web of light for the sunlit shallows. feTurbulence is rasterized
// once; the shimmer comes from slowly transforming the element (cheap).
function Caustics() {
  return (
    <svg
      className={styles.caustics}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <filter id="guppyCaustics">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.016 0.03"
          numOctaves={2}
          seed={7}
          stitchTiles="stitch"
          result="n"
        />
        {/* fix color to a light cyan, threshold the noise into bright veins */}
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.78
                  0 0 0 0 0.95
                  0 0 0 0 1
                  0 0 0 1.5 -0.55"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#guppyCaustics)" />
    </svg>
  );
}

export default function Atmosphere() {
  return (
    <div className={styles.layer} aria-hidden="true">
      <Caustics />

      {RAYS.map((p) => (
        <span key={`r${p.key}`} className={styles.ray} style={p.style} />
      ))}
      {BUBBLES.map((p) => (
        <span key={`b${p.key}`} className={styles.bubble} style={p.style} />
      ))}
      {MOTES.map((p) => (
        <span key={`m${p.key}`} className={styles.mote} style={p.style} />
      ))}
      {SNOW.map((p) => (
        <span key={`s${p.key}`} className={styles.snow} style={p.style} />
      ))}
      {SPECKS.map((p) => (
        <span key={`k${p.key}`} className={styles.speck} style={p.style} />
      ))}

      <div className={styles.vignette} />
    </div>
  );
}

"use client";

import type { CSSProperties } from "react";
import { pick, rng } from "@/lib/rand";
import styles from "./Atmosphere.module.css";

// Ambient depth-zone effects: godrays + bubbles in the shallows, kelp and
// drifting particles in midwater, marine snow and bioluminescent specks in
// the abyss. Everything is seeded (no Math.random in render) and positioned
// in percentages of the ocean's height. Pure transform/opacity animation.

interface Particle {
  key: number;
  style: CSSProperties;
}

function makeParticles(
  seed: string,
  count: number,
  build: (r: () => number, i: number) => CSSProperties,
): Particle[] {
  const r = rng(seed);
  return Array.from({ length: count }, (_, i) => ({
    key: i,
    style: build(r, i),
  }));
}

const RAYS = makeParticles("godrays", 6, (r, i) => ({
  left: `${(6 + i * 15 + pick(r, 0, 8)).toFixed(1)}%`,
  width: `${pick(r, 60, 140).toFixed(0)}px`,
  height: `${pick(r, 480, 640).toFixed(0)}px`,
  animationDuration: `${pick(r, 8, 15).toFixed(1)}s`,
  animationDelay: `${-pick(r, 0, 12).toFixed(1)}s`,
}));

const BUBBLES = makeParticles("bubbles", 16, (r) => {
  const size = pick(r, 4, 9);
  return {
    left: `${pick(r, 3, 94).toFixed(1)}%`,
    top: `${pick(r, 3, 26).toFixed(2)}%`,
    width: size,
    height: size,
    animationDuration: `${pick(r, 8, 16).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 16).toFixed(1)}s`,
  };
});

const MOTES = makeParticles("motes", 18, (r) => {
  const size = pick(r, 2, 3.5);
  return {
    left: `${pick(r, 2, 96).toFixed(1)}%`,
    top: `${pick(r, 33, 58).toFixed(2)}%`,
    width: size,
    height: size,
    animationDuration: `${pick(r, 18, 36).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 30).toFixed(1)}s`,
  };
});

const SNOW = makeParticles("snow", 26, (r) => {
  const size = pick(r, 1.5, 3);
  return {
    left: `${pick(r, 2, 97).toFixed(1)}%`,
    top: `${pick(r, 62, 97).toFixed(2)}%`,
    width: size,
    height: size,
    animationDuration: `${pick(r, 16, 32).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 30).toFixed(1)}s`,
  };
});

const SPECKS = makeParticles("specks", 14, (r) => {
  const size = pick(r, 2, 3.2);
  return {
    left: `${pick(r, 3, 95).toFixed(1)}%`,
    top: `${pick(r, 72, 99).toFixed(2)}%`,
    width: size,
    height: size,
    animationDuration: `${pick(r, 3, 8).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 8).toFixed(1)}s`,
  };
});

export default function Atmosphere() {
  return (
    <div className={styles.layer} aria-hidden="true">
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
    </div>
  );
}

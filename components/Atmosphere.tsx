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

function Kelp({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 90 620"
      width="90"
      height="620"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="rgba(7, 34, 54, 0.3)"
        strokeLinecap="round"
      >
        <path
          strokeWidth="7"
          d="M18 620 C10 540 26 500 16 430 C8 370 24 330 14 260 C8 210 18 170 12 120"
        />
        <path
          strokeWidth="6"
          d="M38 620 C32 560 46 520 38 450 C30 390 44 350 36 280 C30 230 40 180 34 130 C30 100 36 70 32 40"
        />
        <path
          strokeWidth="8"
          d="M60 620 C54 550 70 510 60 440 C52 380 66 340 58 270 C52 220 62 170 56 120 C52 90 58 60 54 30"
        />
        <path
          strokeWidth="5"
          d="M80 620 C76 570 86 530 80 470 C74 420 84 380 78 320 C74 280 80 240 76 200"
        />
      </g>
    </svg>
  );
}

export default function Atmosphere() {
  return (
    <div className={styles.layer} aria-hidden="true">
      {RAYS.map((p) => (
        <span key={`r${p.key}`} className={styles.ray} style={p.style} />
      ))}
      {BUBBLES.map((p) => (
        <span key={`b${p.key}`} className={styles.bubble} style={p.style} />
      ))}
      <Kelp className={styles.kelpLeft} />
      <Kelp className={styles.kelpRight} />
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

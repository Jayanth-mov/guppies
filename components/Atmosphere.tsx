"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { pick, rng } from "@/lib/rand";
import styles from "./Atmosphere.module.css";

// Ambient depth-zone effects: dappled surface light + godrays in the shallows,
// drifting particles through the midwater, marine snow and bioluminescent
// specks in the abyss, under a depth vignette. Particles are split into three
// parallax layers that scroll at different rates, so the water reads as deep.
// Everything is seeded (no Math.random in render); motion is transform/opacity
// so it composites on the GPU.

type Style = Record<string, string | number>;

interface P {
  key: string;
  tier: number; // 0 far, 1 mid, 2 near
  cls: string;
  style: CSSProperties;
}

// far = small, dim, slow, softly blurred; near = big, bright, quick, out of focus
const TIER = [
  { sizeMul: 0.45, blur: 0.5, op: 0.3, speed: 1.8 },
  { sizeMul: 1.15, blur: 0, op: 0.62, speed: 1.0 },
  { sizeMul: 2.3, blur: 1.8, op: 0.95, speed: 0.55 },
];

function gen(
  seed: string,
  count: number,
  cls: string,
  make: (r: () => number, t: (typeof TIER)[number]) => Style,
): P[] {
  const r = rng(seed);
  const arr: P[] = [];
  for (let i = 0; i < count; i++) {
    const ti = Math.floor(pick(r, 0, 3));
    arr.push({ key: `${seed}${i}`, tier: ti, cls, style: make(r, TIER[ti]) as CSSProperties });
  }
  return arr;
}

const BUBBLES = gen("bub", 40, "bubble", (r, t) => {
  const s = (pick(r, 4, 8) * t.sizeMul).toFixed(1);
  return {
    left: `${pick(r, 2, 96).toFixed(1)}%`,
    top: `${pick(r, 1, 29).toFixed(2)}%`,
    width: `${s}px`,
    height: `${s}px`,
    filter: `blur(${t.blur}px)`,
    animationDuration: `${(pick(r, 8, 14) * t.speed).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 16).toFixed(1)}s`,
    "--maxop": t.op,
  };
});

const MOTES = gen("mote", 48, "mote", (r, t) => {
  const s = (pick(r, 2, 3.5) * t.sizeMul).toFixed(1);
  return {
    left: `${pick(r, 2, 96).toFixed(1)}%`,
    top: `${pick(r, 31, 60).toFixed(2)}%`,
    width: `${s}px`,
    height: `${s}px`,
    filter: `blur(${t.blur}px)`,
    opacity: t.op * 0.85,
    animationDuration: `${(pick(r, 16, 32) * t.speed).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 30).toFixed(1)}s`,
  };
});

const SNOW = gen("snow", 60, "snow", (r, t) => {
  const s = (pick(r, 1.5, 3) * t.sizeMul).toFixed(1);
  return {
    left: `${pick(r, 2, 97).toFixed(1)}%`,
    top: `${pick(r, 60, 98).toFixed(2)}%`,
    width: `${s}px`,
    height: `${s}px`,
    filter: `blur(${t.blur}px)`,
    animationDuration: `${(pick(r, 14, 30) * t.speed).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 30).toFixed(1)}s`,
    "--maxop": t.op * 0.8,
  };
});

const SPECKS = gen("speck", 22, "speck", (r) => {
  const s = pick(r, 2, 3.4).toFixed(1);
  return {
    left: `${pick(r, 3, 95).toFixed(1)}%`,
    top: `${pick(r, 70, 99).toFixed(2)}%`,
    width: `${s}px`,
    height: `${s}px`,
    animationDuration: `${pick(r, 3, 8).toFixed(1)}s`,
    animationDelay: `${-pick(r, 0, 8).toFixed(1)}s`,
  };
});

const ALL = [...BUBBLES, ...MOTES, ...SNOW, ...SPECKS];
const TIERS = [0, 1, 2].map((t) => ALL.filter((p) => p.tier === t));

const RAYS = Array.from({ length: 7 }, (_, i) => {
  const r = rng(`ray${i}`);
  return {
    key: i,
    style: {
      left: `${(1 + i * 14 + pick(r, 0, 8)).toFixed(1)}%`,
      width: `${pick(r, 160, 320).toFixed(0)}px`,
      height: `${pick(r, 1000, 1700).toFixed(0)}px`,
      animationDuration: `${pick(r, 12, 22).toFixed(1)}s`,
      animationDelay: `${-pick(r, 0, 16).toFixed(1)}s`,
      "--drift": `${pick(r, 30, 80).toFixed(0)}px`,
    } as CSSProperties,
  };
});

export default function Atmosphere() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // drive the parallax layers from scroll position (rAF-throttled). Skipped
  // under reduced-motion so nothing shifts on scroll.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      el.style.setProperty("--sy", `${window.scrollY}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.layer} ref={rootRef} aria-hidden="true">
      <div className={styles.dapple} />
      <div className={styles.dapple} data-alt />

      {RAYS.map((p) => (
        <span key={`r${p.key}`} className={styles.ray} style={p.style} />
      ))}

      {TIERS.map((group, ti) => (
        <div key={ti} className={styles.plx} data-tier={ti}>
          {group.map((p) => (
            <span key={p.key} className={styles[p.cls]} style={p.style} />
          ))}
        </div>
      ))}

      <div className={styles.vignette} />
    </div>
  );
}

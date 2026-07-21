"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./Clouds.module.css";

// Cloud technique adapted from a CodePen by najarro93 (pen NWvmyGQ): three
// layered box-shadow blobs (white body, grey mid, dark underside) distorted by
// an feTurbulence displacement filter for an organic, wispy silhouette.
//
// Clouds are split into two depth layers — "back" sits behind the hero text,
// "front" drifts over it — and each layer scroll-parallaxes at its own rate so
// the text reads as sitting between them in 3D. Randomized each reload.

interface CloudCfg {
  id: number;
  depth: "back" | "front";
  w: number;
  h: number;
  top: number; // % down the sky (box-shadow offsets the blob ~300px lower)
  scale: number;
  dur: number; // seconds to cross
  delay: number; // negative, to pre-spread the clouds
}

function makeClouds(): CloudCfg[] {
  const n = 6 + Math.floor(Math.random() * 3); // 6–8 (~25% more than before)
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    // alternate so it's reliably ~half in front of the text, half behind
    depth: i % 2 === 0 ? "back" : "front",
    w: 200 + Math.random() * 320,
    h: 100 + Math.random() * 140,
    top: 2 + Math.random() * 74,
    scale: 0.5 + Math.random() * 0.8,
    dur: 95 + Math.random() * 115,
    delay: -(Math.random() * 200),
  }));
}

function Cloud({ c }: { c: CloudCfg }) {
  return (
    <div
      className={styles.cloud}
      style={
        {
          top: `${c.top}%`,
          "--dur": `${c.dur}s`,
          "--delay": `${c.delay}s`,
          "--scale": c.scale,
        } as CSSProperties
      }
    >
      <div className={styles.part} data-l="back" style={{ width: c.w, height: c.h }} />
      <div className={styles.part} data-l="mid" style={{ width: c.w, height: c.h }} />
      <div className={styles.part} data-l="front" style={{ width: c.w, height: c.h }} />
    </div>
  );
}

export default function Clouds() {
  const [clouds, setClouds] = useState<CloudCfg[]>([]);

  useEffect(() => {
    setClouds(makeClouds());
  }, []);

  // scroll-parallax: publish scroll offset to a root var the layers read
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      document.documentElement.style.setProperty("--cloud-sy", `${window.scrollY}px`);
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

  const back = clouds.filter((c) => c.depth === "back");
  const front = clouds.filter((c) => c.depth === "front");

  return (
    <>
      {/* filter defs, rendered once */}
      <svg
        className={styles.defs}
        data-layer="defs"
        width="0"
        height="0"
        aria-hidden="true"
      >
        <filter id="gc-back">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={3} seed={2} />
          <feDisplacementMap in="SourceGraphic" scale={170} />
        </filter>
        <filter id="gc-mid">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={2} />
          <feDisplacementMap in="SourceGraphic" scale={150} />
        </filter>
        <filter id="gc-front">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={2} />
          <feDisplacementMap in="SourceGraphic" scale={50} />
        </filter>
      </svg>

      <div className={styles.clouds} data-layer="clouds" data-depth="back" aria-hidden="true">
        <div className={styles.parallax} data-depth="back">
          {back.map((c) => (
            <Cloud key={c.id} c={c} />
          ))}
        </div>
      </div>

      <div className={styles.clouds} data-layer="clouds" data-depth="front" aria-hidden="true">
        <div className={styles.parallax} data-depth="front">
          {front.map((c) => (
            <Cloud key={c.id} c={c} />
          ))}
        </div>
      </div>
    </>
  );
}

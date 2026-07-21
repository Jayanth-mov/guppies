"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./Clouds.module.css";

// Cloud technique adapted from a CodePen by najarro93 (pen NWvmyGQ): three
// layered box-shadow blobs (white body, grey mid, dark underside) distorted by
// an feTurbulence displacement filter for an organic, wispy silhouette.
// Positions/sizes are randomized on mount so they differ every reload.

interface CloudCfg {
  id: number;
  w: number;
  h: number;
  top: number; // % down the sky
  scale: number;
  dur: number; // seconds to cross
  delay: number; // negative, to pre-spread the clouds
}

function makeClouds(): CloudCfg[] {
  const n = 5 + Math.floor(Math.random() * 2); // 5–6 (each is 3 filtered layers)
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    w: 200 + Math.random() * 320,
    h: 100 + Math.random() * 140,
    top: -22 + Math.random() * 62, // box-shadow offsets the blob ~300px down
    scale: 0.5 + Math.random() * 0.8,
    dur: 95 + Math.random() * 115,
    delay: -(Math.random() * 200),
  }));
}

export default function Clouds() {
  const [clouds, setClouds] = useState<CloudCfg[]>([]);

  useEffect(() => {
    setClouds(makeClouds());
  }, []);

  return (
    <div className={styles.clouds} data-layer="clouds" aria-hidden="true">
      <svg className={styles.defs} width="0" height="0" aria-hidden="true">
        <filter id="gc-back">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves={3}
            seed={2}
          />
          <feDisplacementMap in="SourceGraphic" scale={170} />
        </filter>
        <filter id="gc-mid">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves={2}
            seed={2}
          />
          <feDisplacementMap in="SourceGraphic" scale={150} />
        </filter>
        <filter id="gc-front">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves={2}
            seed={2}
          />
          <feDisplacementMap in="SourceGraphic" scale={50} />
        </filter>
      </svg>

      {clouds.map((c) => (
        <div
          key={c.id}
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
          <div
            className={styles.part}
            data-l="back"
            style={{ width: c.w, height: c.h }}
          />
          <div
            className={styles.part}
            data-l="mid"
            style={{ width: c.w, height: c.h }}
          />
          <div
            className={styles.part}
            data-l="front"
            style={{ width: c.w, height: c.h }}
          />
        </div>
      ))}
    </div>
  );
}

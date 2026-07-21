"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./Clouds.module.css";

// Organic drifting clouds. Positions/shapes are randomized on mount (fresh each
// reload) — generated client-side so SSR and hydration match (empty first).

interface Puff {
  cx: number;
  cy: number;
  r: number;
}
interface CloudCfg {
  id: number;
  top: number;
  scale: number;
  op: number;
  dur: number;
  delay: number;
  x: number; // reduced-motion resting position, in vw
  puffs: Puff[];
}

function makeClouds(): CloudCfg[] {
  const n = 6 + Math.floor(Math.random() * 4); // 6–9
  const clouds: CloudCfg[] = [];
  for (let i = 0; i < n; i++) {
    const puffN = 4 + Math.floor(Math.random() * 3); // 4–6 lumps
    const puffs: Puff[] = [];
    for (let j = 0; j < puffN; j++) {
      const cx = 34 + (j / (puffN - 1)) * 132 + (Math.random() * 22 - 11);
      const r = 20 + Math.random() * 22;
      const cy = 58 - Math.random() * 16;
      puffs.push({ cx, cy, r });
    }
    clouds.push({
      id: i,
      top: 20 + Math.random() * 42, // spread through the sky, over the title
      scale: 0.65 + Math.random() * 1.0,
      op: 0.68 + Math.random() * 0.3,
      dur: 70 + Math.random() * 75,
      delay: -(Math.random() * 145),
      x: 6 + Math.random() * 78,
      puffs,
    });
  }
  return clouds;
}

export default function Clouds() {
  const [clouds, setClouds] = useState<CloudCfg[]>([]);

  useEffect(() => {
    setClouds(makeClouds());
  }, []);

  return (
    <div className={styles.clouds} data-layer="clouds" aria-hidden="true">
      {clouds.map((c) => (
        <span
          key={c.id}
          className={styles.cloud}
          style={
            {
              top: `${c.top}%`,
              "--op": c.op,
              "--dur": `${c.dur}s`,
              "--delay": `${c.delay}s`,
              "--scale": c.scale,
              "--x": c.x,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 200 96" className={styles.cloudSvg}>
            <g fill="#ffffff">
              <ellipse cx="100" cy="74" rx="86" ry="17" />
              {c.puffs.map((p, idx) => (
                <circle key={idx} cx={p.cx} cy={p.cy} r={p.r} />
              ))}
            </g>
          </svg>
        </span>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import {
  bandSpans,
  formatCount,
  formatRange,
  metersFor,
} from "@/lib/species";
import styles from "./DepthGauge.module.css";

interface DepthGaugeProps {
  oceanRef: RefObject<HTMLDivElement | null>;
}

// Desktop-only submarine instrument fixed to the left edge. Tracks the
// viewport center's position inside the ocean and reads out the zone.
export default function DepthGauge({ oceanRef }: DepthGaugeProps) {
  const bands = useMemo(() => bandSpans(), []);
  const [frac, setFrac] = useState<number | null>(null); // null = above the waterline

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = oceanRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const f = (window.innerHeight / 2 - rect.top) / rect.height;
      setFrac(f < 0 ? null : Math.min(f, 1));
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [oceanRef]);

  const active =
    frac === null
      ? -1
      : Math.max(
          0,
          bands.findIndex((b) => frac >= b.top && frac < b.bottom) === -1
            ? bands.length - 1
            : bands.findIndex((b) => frac >= b.top && frac < b.bottom),
        );

  const diveTo = (top: number) => {
    const el = oceanRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = rect.top + window.scrollY + top * rect.height - window.innerHeight * 0.2;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? "auto" : "smooth" });
  };

  const zone = active >= 0 ? bands[active] : null;

  return (
    <aside className={styles.gauge} aria-label="Depth gauge">
      <div className={styles.readout} aria-live="off">
        <span className={styles.meters}>
          {frac === null ? "0 m" : `−${formatCount(metersFor(frac))} m`}
        </span>
        <span className={styles.zone}>
          {zone ? zone.species.name : "Surface"}
        </span>
        <span className={styles.range}>
          {zone ? `${formatRange(zone.species)} followers` : "come on in"}
        </span>
      </div>

      <div className={styles.track}>
        {bands.map((b) => (
          <button
            key={b.index}
            type="button"
            className={styles.seg}
            data-active={active === b.index || undefined}
            style={{
              height: `${((b.bottom - b.top) * 100).toFixed(2)}%`,
              background: b.color,
            }}
            onClick={() => diveTo(b.top)}
            aria-label={`Dive to ${b.species.name} waters, ${formatRange(b.species)} followers`}
            title={`${b.species.name} · ${formatRange(b.species)}`}
          />
        ))}
        {frac !== null && (
          <span
            className={styles.marker}
            style={{ top: `${(frac * 100).toFixed(2)}%` }}
          />
        )}
      </div>
    </aside>
  );
}

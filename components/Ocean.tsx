"use client";

import { forwardRef, useMemo } from "react";
import { bandSpans, formatCount, formatRange } from "@/lib/species";
import type { FishEntry } from "@/lib/roster";
import Fish from "./Fish";
import Atmosphere from "./Atmosphere";
import styles from "./Ocean.module.css";

export const OCEAN_HEIGHT = 7200;

interface OceanProps {
  roster: FishEntry[];
  hovered: string | null;
  onSelectFish: (handle: string) => void;
  swimSeed: string;
}

const Ocean = forwardRef<HTMLDivElement, OceanProps>(function Ocean(
  { roster, hovered, onSelectFish, swimSeed },
  ref,
) {
  const bands = useMemo(() => bandSpans(), []);

  const gradient = useMemo(() => {
    const stops = bands
      .map(
        (b) =>
          `${b.color} ${(b.top * 100 + 0.25).toFixed(2)}%, ${b.color} ${(b.bottom * 100 - 0.25).toFixed(2)}%`,
      )
      .join(", ");
    return `linear-gradient(180deg, ${stops})`;
  }, [bands]);

  const populated = useMemo(
    () => new Set(roster.map((e) => e.speciesIndex)),
    [roster],
  );

  return (
    <div
      ref={ref}
      className={styles.ocean}
      style={{ height: OCEAN_HEIGHT, backgroundImage: gradient }}
    >
      <Atmosphere />

      {bands.map((b) => (
        <div
          key={b.index}
          className={styles.bandLabel}
          data-pale={b.pale || undefined}
          style={{ top: `${(b.top * 100).toFixed(3)}%` }}
        >
          <span className={styles.bandName}>{b.species.name}</span>
          <span className={styles.bandRange}>
            {formatRange(b.species)} followers
          </span>
          {!populated.has(b.index) && b.species.min > 0 && (
            <span className={styles.vacant}>
              vacant waters — {formatCount(b.species.min)} followers to enter
            </span>
          )}
        </div>
      ))}

      {roster.map((e) => (
        <Fish
          key={e.handle}
          entry={e}
          highlighted={hovered === e.handle}
          dimmed={hovered !== null && hovered !== e.handle}
          onSelect={onSelectFish}
          swimSeed={swimSeed}
        />
      ))}
    </div>
  );
});

export default Ocean;

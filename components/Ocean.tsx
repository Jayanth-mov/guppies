"use client";

import { forwardRef, useMemo } from "react";
import { bandSpans, formatRange } from "@/lib/species";
import type { FishEntry } from "@/lib/roster";
import Fish from "./Fish";
import Atmosphere from "./Atmosphere";
import styles from "./Ocean.module.css";

export const OCEAN_HEIGHT = 7200;

interface OceanProps {
  roster: FishEntry[];
  hovered: string | null;
  selected: string | null;
  onSelectFish: (handle: string) => void;
  onDeselectFish: () => void;
  swimSeed: string;
}

const Ocean = forwardRef<HTMLDivElement, OceanProps>(function Ocean(
  { roster, hovered, selected, onSelectFish, onDeselectFish, swimSeed },
  ref,
) {
  // hover wins while active; otherwise the clicked/linked fish stays lit
  const active = hovered ?? selected;
  const bands = useMemo(() => bandSpans(), []);

  const gradient = useMemo(() => {
    // one stop at each band's center so CSS blends smoothly between tiers —
    // a continuous descent rather than 13 hard stripes (the dashed labels
    // still mark the zone boundaries)
    const stops = [
      `${bands[0].color} 0%`,
      ...bands.map(
        (b) => `${b.color} ${(((b.top + b.bottom) / 2) * 100).toFixed(2)}%`,
      ),
      `${bands[bands.length - 1].color} 100%`,
    ].join(", ");
    return `linear-gradient(180deg, ${stops})`;
  }, [bands]);

  return (
    <div
      ref={ref}
      className={styles.ocean}
      style={{ height: OCEAN_HEIGHT, backgroundImage: gradient }}
      onClick={(event) => {
        const target = event.target;
        if (target instanceof Element && target.closest("button")) return;
        onDeselectFish();
      }}
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
        </div>
      ))}

      {roster.map((e) => (
        <Fish
          key={e.handle}
          entry={e}
          highlighted={active === e.handle}
          dimmed={hovered !== null && hovered !== e.handle}
          onSelect={onSelectFish}
          swimSeed={swimSeed}
        />
      ))}
    </div>
  );
});

export default Ocean;

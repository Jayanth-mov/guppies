"use client";

import type { CSSProperties } from "react";
import type { FishEntry } from "@/lib/roster";
import { formatCount } from "@/lib/species";
import { pick, rng } from "@/lib/rand";
import { FISH_SHAPES } from "./FishShapes";
import styles from "./Fish.module.css";

interface FishProps {
  entry: FishEntry;
  highlighted: boolean;
  dimmed: boolean;
  onSelect: (handle: string) => void;
}

export function fishDomId(handle: string): string {
  return `fish-${handle.replace(/[^a-z0-9_-]/gi, "-")}`;
}

export function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function avatarHue(handle: string): number {
  // cold water hues only: teal through deep blue
  return Math.round(pick(rng(`hue:${handle}`), 165, 225));
}

export default function Fish({ entry, highlighted, dimmed, onSelect }: FishProps) {
  const shape = FISH_SHAPES[entry.species.symbolId];
  const r = rng(entry.handle);

  const width = entry.size;
  // keep big fish from drifting off the right edge
  const laneMax = Math.max(10, 58 - width / 8);
  const lane = pick(r, 5, laneMax);
  const driftDur = pick(r, 20, 60);
  const phase = -pick(r, 0, driftDur);
  const traverse = pick(r, 120, 300);
  const bobDur = pick(r, 3.5, 7);
  const bobPhase = -pick(r, 0, bobDur);
  const wagDur = 0.7 + (width / 300) * 1.1;

  const pale = entry.speciesIndex >= 6;
  const abyssal = entry.speciesIndex >= 9;
  const ink = pale ? "#c6e4f4" : "#123a5c";
  const detail = pale ? "rgba(6, 26, 46, 0.55)" : "rgba(255, 255, 255, 0.55)";

  const avatarSize = Math.round(Math.min(28, Math.max(18, width * 0.45)));
  const headPct = (shape.head[0] / shape.w) * 100;

  const style = {
    top: `${(entry.depth * 100).toFixed(3)}%`,
    left: `${lane.toFixed(2)}%`,
    color: ink,
    "--detail": detail,
    "--fw": `${width}px`,
    "--traverse": `${traverse.toFixed(0)}px`,
    "--drift-dur": `${driftDur.toFixed(1)}s`,
    "--phase": `${phase.toFixed(1)}s`,
    "--bob-dur": `${bobDur.toFixed(1)}s`,
    "--bob-phase": `${bobPhase.toFixed(1)}s`,
    "--wag-dur": `${wagDur.toFixed(2)}s`,
    "--av": `${avatarSize}px`,
    "--av-bg": `linear-gradient(135deg, hsl(${avatarHue(entry.handle)} 55% 42%), hsl(${avatarHue(entry.handle)} 65% 28%))`,
  } as CSSProperties;

  return (
    <div
      id={fishDomId(entry.handle)}
      className={styles.wrap}
      data-highlight={highlighted || undefined}
      data-dim={dimmed || undefined}
      data-abyssal={abyssal || undefined}
      style={style}
    >
      <div className={styles.drifter}>
        <div className={styles.bobber}>
          <button
            type="button"
            className={styles.hit}
            onClick={() => onSelect(entry.handle)}
            aria-label={`@${entry.handle} — ${entry.species.name}, ${formatCount(entry.followers)} followers. Open in leaderboard.`}
          >
            <span className={styles.flip}>
              <svg
                className={styles.sprite}
                viewBox={shape.viewBox}
                style={{ aspectRatio: `${shape.w} / ${shape.h}` }}
                aria-hidden="true"
                focusable="false"
              >
                <g className={styles.tail} fill="currentColor">
                  {shape.tail}
                </g>
                <g fill="currentColor">{shape.body}</g>
              </svg>
              <span
                className={styles.avatar}
                style={{ left: `${headPct.toFixed(1)}%` }}
                aria-hidden="true"
              >
                {initialsFor(entry.handle)}
                {entry.avatarUrl && (
                  // initials stay underneath as the fallback if the CDN URL
                  // has expired between fetches
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.avatarImg}
                    src={entry.avatarUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </span>
            </span>
            <span className={styles.label}>
              @{entry.handle}
              <span className={styles.count}>
                {" · "}
                {formatCount(entry.followers)}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

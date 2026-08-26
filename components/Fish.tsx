"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { avatarProxyUrl, type FishEntry } from "@/lib/roster";
import { formatCount, SPECIES } from "@/lib/species";
import { pick, rng } from "@/lib/rand";
import { FISH_SHAPES } from "./FishShapes";
import styles from "./Fish.module.css";

interface FishProps {
  entry: FishEntry;
  highlighted: boolean;
  dimmed: boolean;
  onSelect: (handle: string) => void;
  swimSeed: string;
}

export function fishDomId(handle: string): string {
  return `fish-${handle.replace(/[^a-z0-9_-]/gi, "-")}`;
}

export const SNAPSHOT_SWIM_MS = 2200;

const DRIFT_EASINGS = [
  "ease-in-out",
  "cubic-bezier(0.42, 0, 0.48, 1)",
  "cubic-bezier(0.36, 0, 0.58, 1)",
] as const;

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

function dayChangeChip(change: number | null): string {
  if (change == null) return "—";
  return change >= 0
    ? `+${formatCount(change)} ▲`
    : `${formatCount(change)} ▼`;
}

function dayChangeLabel(change: number | null): string {
  if (change == null) return "Past-day follower change unavailable.";
  if (change === 0) return "No follower change in the past day.";
  return change > 0
    ? `Gained ${formatCount(change)} followers in the past day.`
    : `Lost ${formatCount(Math.abs(change))} followers in the past day.`;
}

export default function Fish({
  entry,
  highlighted,
  dimmed,
  onSelect,
  swimSeed,
}: FishProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const migrationRef = useRef<HTMLDivElement | null>(null);
  const previousPosition = useRef<{ top: number; left: number } | null>(null);
  const migrationAnimation = useRef<Animation | null>(null);
  const migrationCycle = useRef(0);
  const [migrating, setMigrating] = useState<{
    direction: "up" | "down";
    cycle: number;
  } | null>(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const mover = migrationRef.current;
    if (!wrap || !mover) return;
    migrationAnimation.current?.cancel();

    const next = wrap.getBoundingClientRect();
    const before = previousPosition.current;
    previousPosition.current = { top: next.top, left: next.left };
    if (!before) return;
    const deltaX = before.left - next.left;
    const deltaY = before.top - next.top;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

    migrationCycle.current += 1;
    const cycle = migrationCycle.current;
    setMigrating({
      direction: deltaY < 0 ? "down" : "up",
      cycle,
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMigrating(null);
      return;
    }

    // FLIP the full fish from its previous screen coordinate to the new one.
    // This avoids Safari treating clamp()-based top changes as discrete jumps.
    const animation = mover.animate(
      [
        { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
        { transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: SNAPSHOT_SWIM_MS,
        easing: "cubic-bezier(0.22, 0.78, 0.24, 1)",
      },
    );
    migrationAnimation.current = animation;
    void animation.finished
      .then(() => {
        if (migrationCycle.current === cycle) setMigrating(null);
      })
      .catch(() => {
        // A rapid second snapshot intentionally cancels this route.
      });
    return () => animation.cancel();
  }, [entry.depth, entry.size]);

  const shape = FISH_SHAPES[entry.species.symbolId];
  // depth stays data-driven (it encodes rank); only lane + animation timing
  // reshuffle with the per-visit seed
  const r = rng(entry.handle + swimSeed);

  const width = entry.size;
  // keep big fish from drifting off the right edge
  const laneMax = Math.max(10, 58 - width / 8);
  const lane = pick(r, 5, laneMax);
  // Prestige adds visual mass: deep creatures cross less water, take longer
  // to complete each pass, bob more gently, and wag with slower authority.
  const prestige = entry.speciesIndex / Math.max(1, SPECIES.length - 1);
  const driftDur = pick(r, 24, 43) + prestige * 46;
  const phase = -pick(r, 0, driftDur);
  const traverse = pick(r, 120, 300) * (1 - prestige * 0.35);
  const driftEase = DRIFT_EASINGS[
    Math.floor(pick(r, 0, DRIFT_EASINGS.length))
  ];
  const bobDur = pick(r, 3.2, 6.2) + prestige * 4.2;
  const bobPhase = -pick(r, 0, bobDur);
  const bobDistance = (7 - prestige * 3.5) * pick(r, 0.82, 1.18);
  const wagDur = 0.7 + prestige * 1.8;
  const migrationTilt = 7 - prestige * 3;
  const migrationScale = 1.025 - prestige * 0.012;

  const pale = entry.speciesIndex >= 6;
  const abyssal = entry.speciesIndex >= 8;
  const ink = pale ? "#c6e4f4" : "#123a5c";
  const detail = pale ? "rgba(6, 26, 46, 0.55)" : "rgba(255, 255, 255, 0.55)";

  // fixed regardless of species, sized to sit naturally next to the 11px
  // label text rather than to the fish's own body
  const avatarSize = 22;
  const dayChange = entry.stats.day?.change ?? null;

  const style = {
    // clamp keeps the shallowest fish (and their avatars, riding above the
    // sprite) from rendering above the water's top edge
    top: `clamp(60px, ${(entry.depth * 100).toFixed(3)}%, calc(100% - 60px))`,
    left: `${lane.toFixed(2)}%`,
    color: ink,
    "--detail": detail,
    "--orca-body": "#123a5c",
    "--orca-mark": "#c6e4f4",
    "--orca-saddle": "#c6e4f4",
    "--fw": `${width}px`,
    "--traverse": `${traverse.toFixed(0)}px`,
    "--drift-dur": `${driftDur.toFixed(1)}s`,
    "--drift-ease": driftEase,
    "--phase": `${phase.toFixed(1)}s`,
    "--bob-dur": `${bobDur.toFixed(1)}s`,
    "--bob-phase": `${bobPhase.toFixed(1)}s`,
    "--bob-min": `${(-bobDistance).toFixed(2)}px`,
    "--bob-max": `${bobDistance.toFixed(2)}px`,
    "--wag-dur": `${wagDur.toFixed(2)}s`,
    "--climb-tilt": `${(-migrationTilt).toFixed(2)}deg`,
    "--dive-tilt": `${migrationTilt.toFixed(2)}deg`,
    "--climb-settle-tilt": `${(-migrationTilt * 0.43).toFixed(2)}deg`,
    "--dive-settle-tilt": `${(migrationTilt * 0.43).toFixed(2)}deg`,
    "--migration-scale": migrationScale.toFixed(3),
    "--migration-settle-scale": (1 + (migrationScale - 1) * 0.4).toFixed(3),
    "--av": `${avatarSize}px`,
    "--av-bg": `linear-gradient(135deg, hsl(${avatarHue(entry.handle)} 55% 42%), hsl(${avatarHue(entry.handle)} 65% 28%))`,
  } as CSSProperties;

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      data-highlight={highlighted || undefined}
      data-dim={dimmed || undefined}
      data-abyssal={abyssal || undefined}
      data-migrating={migrating?.direction}
      style={style}
    >
      <div
        id={fishDomId(entry.handle)}
        ref={migrationRef}
        className={styles.migration}
      >
        <div className={styles.drifter}>
          <div className={styles.bobber}>
            <button
              type="button"
              className={styles.hit}
              onClick={() => onSelect(entry.handle)}
              aria-label={`${entry.handle} — ${entry.species.name}, ${formatCount(entry.followers)} followers. ${dayChangeLabel(dayChange)} Open in leaderboard.`}
            >
              <span className={styles.countAbove} aria-hidden="true">
                {formatCount(entry.followers)}
              </span>
              <span className={styles.flip}>
                <svg
                  key={`${entry.species.symbolId}:${migrating?.cycle ?? "idle"}`}
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
              </span>
              <span className={styles.label}>
                <span className={styles.avatar} aria-hidden="true">
                  {initialsFor(entry.handle)}
                  {/* Initials stay underneath if Meta has never supplied a
                      picture. The stable proxy serves the last cached image
                      even when a snapshot temporarily omits its CDN URL. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={entry.avatarUrl ?? "missing"}
                    className={styles.avatarImg}
                    src={avatarProxyUrl(entry.handle)}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </span>
                <span className={styles.labelName}>{entry.handle}</span>
                <span
                  className={styles.labelDelta}
                  data-dir={
                    dayChange == null
                      ? undefined
                      : dayChange >= 0
                        ? "up"
                        : "down"
                  }
                  aria-hidden="true"
                >
                  {dayChangeChip(dayChange)}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

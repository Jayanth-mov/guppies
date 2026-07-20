"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  RANGE_KEYS,
  type FishEntry,
  type RangeKey,
  type RangeStat,
} from "@/lib/roster";
import { BAND_COLORS, formatCount } from "@/lib/species";
import { avatarHue, initialsFor } from "./Fish";
import { FISH_SHAPES } from "./FishShapes";
import styles from "./LeaderboardPanel.module.css";

export type SortMode = "followers" | "growth";

interface PanelProps {
  open: boolean;
  onClose: () => void;
  roster: FishEntry[];
  lastUpdated: string;
  sortMode: SortMode;
  onSortMode: (m: SortMode) => void;
  hovered: string | null;
  onHoverRow: (handle: string | null) => void;
  focusRow: string | null;
  onFocusRowHandled: () => void;
}

const RANGE_LABEL: Record<RangeKey, string> = {
  latest: "Latest",
  day: "Past day",
  week: "Past week",
  month: "Past month",
};

function formatAgo(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}sec ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}hr${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const dirOf = (n: number | null | undefined): "up" | "down" | undefined =>
  n == null ? undefined : n >= 0 ? "up" : "down";
const changeChip = (c: number | null | undefined) =>
  c == null ? "—" : c >= 0 ? `+${formatCount(c)} ▲` : `${formatCount(c)} ▼`;
const changeNum = (c: number | null | undefined) =>
  c == null ? "—" : `${c >= 0 ? "+" : ""}${formatCount(c)}`;
const pctChip = (p: number | null | undefined) =>
  p == null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;

// tiny species silhouette, colored by its depth band
function MiniFish({ speciesIndex, symbolId }: { speciesIndex: number; symbolId: string }) {
  const shape = FISH_SHAPES[symbolId];
  return (
    <span className={styles.miniFishSlot} aria-hidden="true">
      <svg
        className={styles.miniFish}
        viewBox={shape.viewBox}
        style={{
          aspectRatio: `${shape.w} / ${shape.h}`,
          color: BAND_COLORS[speciesIndex],
          ["--detail" as string]: "rgba(233, 247, 255, 0.5)",
        }}
      >
        <g fill="currentColor">{shape.tail}</g>
        <g fill="currentColor">{shape.body}</g>
      </svg>
    </span>
  );
}

export default function LeaderboardPanel({
  open,
  onClose,
  roster,
  lastUpdated,
  sortMode,
  onSortMode,
  hovered,
  onHoverRow,
  focusRow,
  onFocusRowHandled,
}: PanelProps) {
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const rangeRef = useRef<HTMLDivElement | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [updatedAgo, setUpdatedAgo] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("day");
  const [menuOpen, setMenuOpen] = useState(false);

  // each tab has its own default window; switching tabs resets to it
  useEffect(() => {
    setRange(sortMode === "growth" ? "week" : "day");
    setMenuOpen(false);
  }, [sortMode]);

  // ticks every second so "35sec ago" stays honest, not just on the minute
  useEffect(() => {
    const compute = () =>
      setUpdatedAgo(formatAgo(Date.now() - new Date(lastUpdated).getTime()));
    compute();
    const t = window.setInterval(compute, 1000);
    return () => window.clearInterval(t);
  }, [lastUpdated]);

  const sorted = useMemo(() => {
    const arr = roster.slice();
    if (sortMode === "growth") {
      arr.sort(
        (a, b) =>
          (b.stats[range]?.pct ?? -Infinity) - (a.stats[range]?.pct ?? -Infinity),
      );
    }
    return arr; // roster arrives sorted by followers
  }, [roster, sortMode, range]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (menuOpen) setMenuOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, menuOpen]);

  // close the range menu on an outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // fish click → scroll its row into view and flash it
  useEffect(() => {
    if (!open || !focusRow) return;
    const t = window.setTimeout(() => {
      const row = rowRefs.current.get(focusRow);
      if (row) {
        row.scrollIntoView({ block: "center", behavior: "auto" });
        setFlash(focusRow);
        window.setTimeout(() => setFlash(null), 1400);
      }
      onFocusRowHandled();
    }, 60);
    return () => window.clearTimeout(t);
  }, [open, focusRow, onFocusRowHandled]);

  const renderNums = (stat: RangeStat | null, followers: number) => {
    if (sortMode === "followers") {
      return (
        <span className={styles.nums}>
          <span className={styles.primary}>{formatCount(followers)}</span>
          <span className={styles.secondary} data-dir={dirOf(stat?.change)}>
            {changeChip(stat?.change ?? null)}
          </span>
        </span>
      );
    }
    // growth: absolute change | percent, with a divider between
    return (
      <span className={styles.growthCell}>
        <span className={styles.growthNum} data-dir={dirOf(stat?.change)}>
          {changeNum(stat?.change ?? null)}
        </span>
        <span className={styles.growthDivider} aria-hidden="true" />
        <span className={styles.growthPct} data-dir={dirOf(stat?.pct)}>
          {pctChip(stat?.pct ?? null)}
        </span>
      </span>
    );
  };

  return (
    <section
      id="leaderboard"
      className={styles.panel}
      data-open={open || undefined}
      aria-label="Leaderboard"
      inert={!open}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>Leaderboard</h2>
      </header>

      <div className={styles.toggle} role="group" aria-label="Sort leaderboard">
        <button
          type="button"
          data-on={sortMode === "followers" || undefined}
          aria-pressed={sortMode === "followers"}
          onClick={() => onSortMode("followers")}
        >
          Followers
        </button>
        <button
          type="button"
          data-on={sortMode === "growth" || undefined}
          aria-pressed={sortMode === "growth"}
          onClick={() => onSortMode("growth")}
        >
          Growth
        </button>
      </div>

      <ol className={styles.list}>
        {sorted.map((e, i) => (
          <li key={e.handle}>
            <a
              ref={(el) => {
                if (el) rowRefs.current.set(e.handle, el);
                else rowRefs.current.delete(e.handle);
              }}
              className={styles.row}
              href={`https://instagram.com/${e.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              data-hot={hovered === e.handle || undefined}
              data-flash={flash === e.handle || undefined}
              onMouseEnter={() => onHoverRow(e.handle)}
              onMouseLeave={() => onHoverRow(null)}
              onFocus={() => onHoverRow(e.handle)}
              onBlur={() => onHoverRow(null)}
            >
              <span className={styles.rank}>{i + 1}</span>
              <span
                className={styles.avatar}
                style={{
                  background: `linear-gradient(135deg, hsl(${avatarHue(e.handle)} 55% 42%), hsl(${avatarHue(e.handle)} 65% 28%))`,
                }}
                aria-hidden="true"
              >
                {initialsFor(e.handle)}
                {e.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.avatarImg}
                    src={e.avatarUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(ev) => {
                      ev.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </span>
              <span className={styles.who}>
                <span className={styles.name}>{e.handle}</span>
                <span className={styles.sub}>
                  <MiniFish
                    speciesIndex={e.speciesIndex}
                    symbolId={e.species.symbolId}
                  />
                  {e.species.name}
                </span>
              </span>
              {renderNums(e.stats[range], e.followers)}
            </a>
          </li>
        ))}
      </ol>

      <div className={styles.rangeBar} ref={rangeRef}>
        {menuOpen && (
          <div className={styles.menu} role="menu">
            <div className={styles.menuHead}>
              <span className={styles.menuUpdated}>
                last updated {updatedAgo ?? "—"}
              </span>
              <span className={styles.menuHint}>updates hourly</span>
            </div>
            {RANGE_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                role="menuitemradio"
                aria-checked={range === k}
                className={styles.menuItem}
                data-on={range === k || undefined}
                onClick={() => {
                  setRange(k);
                  setMenuOpen(false);
                }}
              >
                {RANGE_LABEL[k]}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={styles.rangeBtn}
          data-open={menuOpen || undefined}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className={styles.rangeCaption}>
            {sortMode === "growth" ? "growth over" : "showing"}
          </span>
          <span className={styles.rangeValue}>{RANGE_LABEL[range]}</span>
          <span className={styles.chevron} aria-hidden="true">
            ▾
          </span>
        </button>
      </div>
    </section>
  );
}

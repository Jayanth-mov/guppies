"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FishEntry } from "@/lib/roster";
import { BAND_COLORS, formatCount } from "@/lib/species";
import { avatarHue, initialsFor } from "./Fish";
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
  const [flash, setFlash] = useState<string | null>(null);
  const [updatedAgo, setUpdatedAgo] = useState<string | null>(null);
  const [tipOpen, setTipOpen] = useState(false);

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
    if (sortMode === "growth")
      arr.sort(
        (a, b) => (b.growthWeek ?? -Infinity) - (a.growthWeek ?? -Infinity),
      );
    return arr; // roster arrives sorted by followers
  }, [roster, sortMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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

  const deltaChip = (d: number | null) =>
    d === null ? "—" : d >= 0 ? `+${formatCount(d)} ▲` : `${formatCount(d)} ▼`;
  const growthChip = (g: number | null) =>
    g === null ? "—" : `${g >= 0 ? "+" : ""}${g.toFixed(1)}%`;
  const dirOf = (n: number | null): "up" | "down" | undefined =>
    n === null ? undefined : n >= 0 ? "up" : "down";

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

      <div
        className={styles.toggle}
        role="group"
        aria-label="Sort leaderboard"
      >
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
          This week
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
                <span className={styles.name}>
                  {e.handle}
                  {e.isHost && <span className={styles.host}>host</span>}
                </span>
                <span className={styles.sub}>
                  <i
                    className={styles.dot}
                    style={{ background: BAND_COLORS[e.speciesIndex] }}
                  />
                  {e.species.name}
                </span>
              </span>
              <span className={styles.nums}>
                <span
                  className={styles.primary}
                  data-dir={
                    sortMode === "growth" ? dirOf(e.growthWeek) : undefined
                  }
                >
                  {sortMode === "followers"
                    ? formatCount(e.followers)
                    : growthChip(e.growthWeek)}
                </span>
                <span
                  className={styles.secondary}
                  data-dir={sortMode === "followers" ? dirOf(e.delta) : undefined}
                >
                  {sortMode === "followers"
                    ? deltaChip(e.delta)
                    : `${formatCount(e.followers)} total`}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className={styles.updated}
        data-show={tipOpen || undefined}
        aria-label={`Last updated ${updatedAgo ?? "unknown"}. Updates every 4 hours.`}
        data-tip="Updates every 4 hours"
        onClick={() => setTipOpen((v) => !v)}
        onBlur={() => setTipOpen(false)}
      >
        <span className={styles.updatedLabel}>last updated</span>
        <span className={styles.updatedTime}>{updatedAgo ?? "—"}</span>
      </button>
    </section>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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

type SheetPos = "half" | "full";

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
  const sheetRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [pos, setPos] = useState<SheetPos>("half");
  const [dragY, setDragY] = useState<number | null>(null);
  const dragStart = useRef<{ y: number; base: number } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [updatedAgo, setUpdatedAgo] = useState<string | null>(null);

  // relative time is computed client-side only, so SSR markup stays stable
  useEffect(() => {
    const compute = () => {
      const h = Math.max(
        0,
        Math.round((Date.now() - new Date(lastUpdated).getTime()) / 3.6e6),
      );
      setUpdatedAgo(
        h < 1
          ? "just now"
          : h < 48
            ? `${h} hour${h === 1 ? "" : "s"} ago`
            : `${Math.round(h / 24)} days ago`,
      );
    };
    compute();
    const t = window.setInterval(compute, 60_000);
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

  // opening always starts the mobile sheet at half
  useEffect(() => {
    if (open) setPos("half");
  }, [open]);

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

  const isMobile = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 979px)").matches;

  const baseOffset = useCallback((p: SheetPos) => {
    const h = sheetRef.current?.clientHeight ?? 0;
    return p === "full" ? 0 : h * 0.48;
  }, []);

  const onDragStart = (e: ReactPointerEvent) => {
    if (!isMobile()) return;
    dragStart.current = { y: e.clientY, base: baseOffset(pos) };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: ReactPointerEvent) => {
    if (!dragStart.current) return;
    const h = sheetRef.current?.clientHeight ?? 1;
    const off = Math.min(
      Math.max(dragStart.current.base + e.clientY - dragStart.current.y, 0),
      h,
    );
    setDragY(off);
  };

  const onDragEnd = () => {
    if (!dragStart.current) return;
    const h = sheetRef.current?.clientHeight ?? 1;
    const off = dragY ?? dragStart.current.base;
    dragStart.current = null;
    setDragY(null);
    if (off > h * 0.72) onClose();
    else if (off > h * 0.24) setPos("half");
    else setPos("full");
  };

  const deltaChip = (d: number | null) =>
    d === null ? "—" : d >= 0 ? `+${formatCount(d)} ▲` : `${formatCount(d)} ▼`;
  const growthChip = (g: number | null) =>
    g === null ? "—" : `${g >= 0 ? "+" : ""}${g.toFixed(1)}%`;
  const dirOf = (n: number | null): "up" | "down" | undefined =>
    n === null ? undefined : n >= 0 ? "up" : "down";

  return (
    <section
      ref={sheetRef}
      id="leaderboard"
      className={styles.panel}
      data-open={open || undefined}
      data-pos={pos}
      style={
        dragY !== null
          ? { transform: `translateY(${dragY}px)`, transition: "none" }
          : undefined
      }
      aria-label="Leaderboard"
      inert={!open}
    >
      <div
        className={styles.grip}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <span className={styles.gripBar} aria-hidden="true" />
      </div>

      <header className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.title}>Leaderboard</h2>
          {updatedAgo && (
            <span
              className={styles.updated}
              tabIndex={0}
              aria-label="Updates every 4 hours"
              data-tip="Updates every 4 hours"
            >
              last updated {updatedAgo}
              <span className={styles.info} aria-hidden="true">
                i
              </span>
            </span>
          )}
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close leaderboard"
        >
          ×
        </button>
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

      <p className={styles.note}>
        Live follower counts. Deltas and weekly growth begin once scheduled
        tracking is running.
      </p>
    </section>
  );
}

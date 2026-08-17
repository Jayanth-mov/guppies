"use client";

import { useEffect, useMemo, useState } from "react";
import { avatarProxyUrl, type FishEntry } from "@/lib/roster";
import { formatCount, speciesFor } from "@/lib/species";
import type { WeeklyHistoryPayload } from "@/lib/weekly";
import { avatarHue, initialsFor } from "./Fish";
import { FISH_SHAPES } from "./FishShapes";
import styles from "./WeeklySnapshotPanel.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  roster: FishEntry[];
}

interface SnapshotRow {
  handle: string;
  followers: number;
  delta: number | null;
  pct: number | null;
  species: ReturnType<typeof speciesFor>;
}

function dateLabel(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function shortDateLabel(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function capturedLabel(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

function deltaLabel(delta: number | null): string {
  if (delta == null) return "First snapshot";
  if (delta === 0) return "No change";
  return `${delta > 0 ? "+" : ""}${formatCount(delta)} ${delta > 0 ? "▲" : "▼"}`;
}

function SnapshotFish({ symbolId }: { symbolId: string }) {
  const shape = FISH_SHAPES[symbolId];
  return (
    <span className={styles.fishSlot} aria-hidden="true">
      <svg
        className={styles.fish}
        viewBox={shape.viewBox}
        style={{
          aspectRatio: `${shape.w} / ${shape.h}`,
          ["--detail" as string]: "rgba(4, 16, 31, 0.5)",
        }}
      >
        <g fill="currentColor">{shape.tail}</g>
        <g fill="currentColor">{shape.body}</g>
      </svg>
    </span>
  );
}

export default function WeeklySnapshotPanel({ open, onClose, roster }: Props) {
  const [history, setHistory] = useState<WeeklyHistoryPayload | null>(null);
  const [selected, setSelected] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch("/api/history/weekly", {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Weekly history is unavailable.");
        return response.json() as Promise<WeeklyHistoryPayload>;
      })
      .then((payload) => {
        setHistory(payload);
        setSelected(Math.max(0, payload.weeks.length - 1));
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, reload]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const currentByHandle = useMemo(
    () => new Map(roster.map((entry) => [entry.handle, entry])),
    [roster],
  );
  const snapshot = history?.weeks[selected] ?? null;
  const previous =
    history && selected > 0 ? history.weeks[selected - 1] : null;

  const rows = useMemo<SnapshotRow[]>(() => {
    if (!snapshot) return [];
    return Object.entries(snapshot.counts)
      .map(([handle, followers]) => {
        const before = previous?.counts[handle];
        const delta = before == null ? null : followers - before;
        return {
          handle,
          followers,
          delta,
          pct:
            delta == null || before == null || before <= 0
              ? null
              : (delta / before) * 100,
          species: speciesFor(followers),
        };
      })
      .sort((a, b) => b.followers - a.followers);
  }, [snapshot, previous]);

  if (!open) return null;

  return (
    <section className={styles.overlay} aria-label="Weekly snapshots">
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label="Close weekly snapshots"
      />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-snapshot-title"
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Time travel</p>
            <h2 id="weekly-snapshot-title" className={styles.title}>
              Weekly snapshots
            </h2>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close weekly snapshots"
          >
            ×
          </button>
        </header>

        {loading && !history ? (
          <div className={styles.state}>Loading the archive…</div>
        ) : error ? (
          <div className={styles.state}>
            <p>{error}</p>
            <button type="button" onClick={() => setReload((value) => value + 1)}>
              Try again
            </button>
          </div>
        ) : !history?.weeks.length || !snapshot ? (
          <div className={styles.state}>
            The first weekly snapshot will appear after the next refresh.
          </div>
        ) : (
          <>
            <div className={styles.navigator}>
              <button
                type="button"
                className={styles.arrow}
                disabled={selected === 0}
                onClick={() => setSelected((value) => Math.max(0, value - 1))}
                aria-label="Previous week"
              >
                ←
              </button>
              <label className={styles.weekPicker}>
                <span>Week of</span>
                <select
                  value={selected}
                  onChange={(event) => setSelected(Number(event.target.value))}
                >
                  {history.weeks.map((week, index) => (
                    <option key={week.weekStart} value={index}>
                      {dateLabel(week.weekStart, history.timezone)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={styles.arrow}
                disabled={selected === history.weeks.length - 1}
                onClick={() =>
                  setSelected((value) =>
                    Math.min(history.weeks.length - 1, value + 1),
                  )
                }
                aria-label="Next week"
              >
                →
              </button>
            </div>

            <div className={styles.summary}>
              <div>
                <strong>{dateLabel(snapshot.weekStart, history.timezone)}</strong>
                <span>Captured {capturedLabel(snapshot.capturedAt, history.timezone)}</span>
              </div>
              <div className={styles.summaryCount}>
                <strong>{rows.length}</strong>
                <span>swimmers</span>
              </div>
            </div>

            <div className={styles.comparison}>
              {previous
                ? `Changes shown versus ${shortDateLabel(previous.weekStart, history.timezone)}`
                : `The archive begins here · ${history.startsOn}`}
            </div>

            <ol className={styles.list}>
              {rows.map((row, index) => {
                const current = currentByHandle.get(row.handle);
                return (
                  <li key={row.handle}>
                    <a
                      className={styles.row}
                      href={`https://instagram.com/${row.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={styles.rank}>{index + 1}</span>
                      <span
                        className={styles.avatar}
                        style={{
                          background: `linear-gradient(135deg, hsl(${avatarHue(row.handle)} 55% 42%), hsl(${avatarHue(row.handle)} 65% 28%))`,
                        }}
                        aria-hidden="true"
                      >
                        {initialsFor(row.handle)}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className={styles.avatarImg}
                          src={avatarProxyUrl(row.handle)}
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      </span>
                      <span className={styles.identity}>
                        <strong>{current?.name ?? row.handle}</strong>
                        <span>
                          <SnapshotFish symbolId={row.species.symbolId} />
                          @{row.handle} · {row.species.name}
                        </span>
                      </span>
                      <span className={styles.numbers}>
                        <strong>{formatCount(row.followers)}</strong>
                        <span
                          data-dir={
                            row.delta == null
                              ? undefined
                              : row.delta >= 0
                                ? "up"
                                : "down"
                          }
                        >
                          {deltaLabel(row.delta)}
                          {row.pct != null && ` · ${row.pct >= 0 ? "+" : ""}${row.pct.toFixed(1)}%`}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>

            <footer className={styles.footer}>
              Counts, ranks, and fish species are historical. Profile pictures
              use their current versions.
            </footer>
          </>
        )}
      </div>
    </section>
  );
}

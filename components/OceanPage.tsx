"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { getLastUpdated, getRoster } from "@/lib/roster";
import Ocean from "./Ocean";
import DepthGauge from "./DepthGauge";
import LeaderboardPanel, { type SortMode } from "./LeaderboardPanel";
import EvolutionToast from "./EvolutionToast";
import styles from "./OceanPage.module.css";

export default function OceanPage() {
  const roster = useMemo(() => getRoster(), []);
  const [open, setOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("followers");
  const [hovered, setHovered] = useState<string | null>(null);
  const [focusRow, setFocusRow] = useState<string | null>(null);
  const oceanRef = useRef<HTMLDivElement | null>(null);
  const hoverTimer = useRef<number | null>(null);

  const scrollToFish = useCallback(
    (handle: string) => {
      const el = oceanRef.current;
      const entry = roster.find((e) => e.handle === handle);
      if (!el || !entry) return;
      const rect = el.getBoundingClientRect();
      const y =
        rect.top + window.scrollY + entry.depth * rect.height - window.innerHeight / 2;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.scrollTo({ top: Math.max(0, y), behavior: reduced ? "auto" : "smooth" });
    },
    [roster],
  );

  // hovering a row lights up its fish and glides the ocean to it (debounced
  // so sweeping the cursor down the list doesn't thrash the scroll)
  const handleHoverRow = useCallback(
    (handle: string | null) => {
      setHovered(handle);
      if (hoverTimer.current) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      if (handle && window.matchMedia("(min-width: 980px)").matches) {
        hoverTimer.current = window.setTimeout(
          () => scrollToFish(handle),
          180,
        );
      }
    },
    [scrollToFish],
  );

  const handleSelectFish = useCallback((handle: string) => {
    setOpen(true);
    setFocusRow(handle);
  }, []);

  return (
    <div className={`${styles.world} ${open ? styles.squeezed : ""}`}>
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="leaderboard"
      >
        <svg viewBox="0 0 24 14" width="22" height="13" aria-hidden="true">
          <path
            d="M2 7c3.6-4.4 9-6 13-4 1.8.9 3.1 2.2 4 4-.9 1.8-2.2 3.1-4 4-4 2-9.4.4-13-4z"
            fill="currentColor"
          />
          <path d="M17 7l6-4-1.8 4L23 11z" fill="currentColor" />
        </svg>
        Leaderboard
      </button>

      <header className={styles.hero}>
        <p className={styles.kicker}>guppies.jayanth.mov</p>
        <h1 className={styles.title}>guppies</h1>
        <p className={styles.tagline}>
          A follower ocean. Bigger fish live deeper.
        </p>
        <p className={styles.hint}>
          scroll to dive{" "}
          <span className={styles.arrow} aria-hidden="true">
            ↓
          </span>
        </p>
      </header>

      <main>
        <Ocean
          ref={oceanRef}
          roster={roster}
          hovered={hovered}
          onSelectFish={handleSelectFish}
        />
      </main>

      <footer className={styles.floor}>
        <h2 className={styles.floorTitle}>The sea floor</h2>
        <p className={styles.floorLine}>
          {roster.length} swimmers and counting. Built by{" "}
          <a
            href="https://instagram.com/jayanth.mov"
            target="_blank"
            rel="noopener noreferrer"
          >
            @jayanth.mov
          </a>
          .
        </p>
        <p className={styles.floorNote}>
          Live Instagram follower counts, refreshed periodically.
        </p>
      </footer>

      <DepthGauge oceanRef={oceanRef} />

      <LeaderboardPanel
        open={open}
        onClose={() => setOpen(false)}
        roster={roster}
        lastUpdated={getLastUpdated()}
        sortMode={sortMode}
        onSortMode={setSortMode}
        hovered={hovered}
        onHoverRow={handleHoverRow}
        focusRow={focusRow}
        onFocusRowHandled={() => setFocusRow(null)}
      />

      <EvolutionToast roster={roster} />
    </div>
  );
}

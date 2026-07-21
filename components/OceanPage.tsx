"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLastUpdated,
  getRoster,
  sourceFromLive,
  type LiveRoster,
} from "@/lib/roster";
import Ocean from "./Ocean";
import { fishDomId } from "./Fish";
import Clouds from "./Clouds";
import DepthGauge from "./DepthGauge";
import LeaderboardPanel, { type SortMode } from "./LeaderboardPanel";
import EvolutionToast from "./EvolutionToast";
import styles from "./OceanPage.module.css";

export default function OceanPage() {
  // bundled accounts.json renders immediately; the live snapshot (if the
  // pipeline has ever run) overlays it a moment later
  const [roster, setRoster] = useState(() => getRoster());
  const [lastUpdated, setLastUpdated] = useState(() => getLastUpdated());
  const [open, setOpen] = useState(false);
  // gates EvolutionToast until the roster has settled (live data applied, or
  // confirmed unavailable) — otherwise it'd compare against localStorage
  // twice in one visit (bundled, then live) and could double-fire a toast
  const [rosterSettled, setRosterSettled] = useState(false);
  // reshuffles each visit so fish don't drift in identical lanes/phases every
  // reload. Starts empty so SSR and first hydration match, then randomizes.
  const [swimSeed, setSwimSeed] = useState("");

  useEffect(() => {
    setSwimSeed(`:${Math.floor(Math.random() * 1e9)}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/roster")
      .then((r) => (r.ok ? (r.json() as Promise<LiveRoster>) : null))
      .then((live) => {
        if (!cancelled && live) {
          setRoster(getRoster(sourceFromLive(live)));
          setLastUpdated(live.lastUpdated);
        }
      })
      .catch(() => {
        // offline or no pipeline yet — bundled data stands
      })
      .finally(() => {
        if (!cancelled) setRosterSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [sortMode, setSortMode] = useState<SortMode>("followers");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusRow, setFocusRow] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const oceanRef = useRef<HTMLDivElement | null>(null);
  const hoverTimer = useRef<number | null>(null);

  const handleCopyLink = useCallback(async () => {
    const url = window.location.href;
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // fallback for older browsers / non-secure contexts
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }, []);

  // scroll so the fish sits centered on screen. Reads the fish's live DOM
  // position, so it stays accurate even after the drift animation or a data
  // refresh moves it.
  const scrollToFish = useCallback((handle: string) => {
    const el = document.getElementById(fishDomId(handle));
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = rect.top + window.scrollY + rect.height / 2 - window.innerHeight / 2;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? "auto" : "smooth" });
  }, []);

  // open a shared link (#handle): start at the hero, then glide down to the
  // selected fish so the recipient sees the descent
  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (!raw) return;
    const handle = decodeURIComponent(raw);
    if (!roster.some((e) => e.handle === handle)) return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    setSelected(handle);
    const t = window.setTimeout(() => scrollToFish(handle), 900);
    return () => window.clearTimeout(t);
    // once, on mount — `roster` here is the bundled data and has every handle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // deliberate hold, not a flinch — sweeping the cursor down the list
        // shouldn't drag the ocean along with it
        hoverTimer.current = window.setTimeout(
          () => scrollToFish(handle),
          750,
        );
      }
    },
    [scrollToFish],
  );

  const handleSelectFish = useCallback(
    (handle: string) => {
      setSelected(handle);
      setFocusRow(handle);
      scrollToFish(handle);
      // shareable deep link; replaceState so rapid clicks don't stack history
      window.history.replaceState(null, "", `#${handle}`);
      // desktop drawer squeezes the ocean; on mobile it'd cover the fish we
      // just centered, so only auto-open the leaderboard on wide screens
      if (window.matchMedia("(min-width: 980px)").matches) {
        setOpen(true);
      }
    },
    [scrollToFish],
  );

  return (
    <div className={`${styles.world} ${open ? styles.squeezed : ""}`}>
      <button
        type="button"
        className={styles.fab}
        data-open={open || undefined}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="leaderboard"
        aria-label={open ? "Close leaderboard" : "Open leaderboard"}
      >
        {open ? (
          <span className={styles.fabClose} aria-hidden="true">
            ×
          </span>
        ) : (
          <>
            <svg viewBox="0 0 24 14" width="22" height="13" aria-hidden="true">
              <path
                d="M2 7c3.6-4.4 9-6 13-4 1.8.9 3.1 2.2 4 4-.9 1.8-2.2 3.1-4 4-4 2-9.4.4-13-4z"
                fill="currentColor"
              />
              <path d="M17 7l6-4-1.8 4L23 11z" fill="currentColor" />
            </svg>
            Leaderboard
          </>
        )}
      </button>

      <header className={styles.hero}>
        <div className={styles.sky} data-layer="sky" aria-hidden="true">
          <span className={styles.sun} />
          <span className={styles.sunStreak} />
          <span className={styles.flareGhost} data-g="1" />
          <span className={styles.flareGhost} data-g="2" />
          <span className={styles.flareGhost} data-g="3" />
          <span className={styles.flareGhost} data-g="4" />
          <span className={styles.waterline} />
        </div>
        <button
          type="button"
          className={styles.kicker}
          onClick={handleCopyLink}
          aria-label="Copy link to this page"
        >
          guppies.jayanth.mov
          <svg
            className={styles.linkIcon}
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 15l6-6" />
            <path d="M11 6.5l1-1a4 4 0 015.5 5.5l-1 1" />
            <path d="M13 17.5l-1 1a4 4 0 01-5.5-5.5l1-1" />
          </svg>
          <span className={styles.copied} data-show={copied || undefined}>
            copied!
          </span>
        </button>
        <h1 className={styles.title}>guppies</h1>
        <p className={styles.tagline}>
          A fish-themed leaderboard for lighthearted, friendly competition
          within the circle.
        </p>
        <button
          type="button"
          className={styles.heroCta}
          onClick={() => setOpen(true)}
        >
          View the leaderboard
        </button>
        <p className={styles.hint}>
          scroll to dive{" "}
          <span className={styles.arrow} aria-hidden="true">
            ↓
          </span>
        </p>

        <Clouds />
      </header>

      <main>
        <Ocean
          ref={oceanRef}
          roster={roster}
          hovered={hovered}
          selected={selected}
          onSelectFish={handleSelectFish}
          swimSeed={swimSeed}
        />
      </main>

      <footer className={styles.floor}>
        <h2 className={styles.floorTitle}>The sea floor</h2>
        <p className={styles.floorLine}>{roster.length} swimmers and counting.</p>
        <p className={styles.floorNote}>
          Live Instagram follower counts, refreshed periodically.
        </p>
      </footer>

      <DepthGauge oceanRef={oceanRef} />

      <LeaderboardPanel
        open={open}
        onClose={() => setOpen(false)}
        roster={roster}
        lastUpdated={lastUpdated}
        sortMode={sortMode}
        onSortMode={setSortMode}
        hovered={hovered}
        onHoverRow={handleHoverRow}
        focusRow={focusRow}
        onFocusRowHandled={() => setFocusRow(null)}
      />

      {rosterSettled && <EvolutionToast roster={roster} />}
    </div>
  );
}

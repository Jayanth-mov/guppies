"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getLastUpdated,
  getRoster,
  sourceFromLive,
  sourceFromWeekly,
  type LiveRoster,
  type RangeKey,
} from "@/lib/roster";
import type { WeeklyHistoryPayload } from "@/lib/weekly";
import Ocean from "./Ocean";
import { fishDomId, SNAPSHOT_SWIM_MS } from "./Fish";
import Clouds from "./Clouds";
import DepthGauge from "./DepthGauge";
import LeaderboardPanel, { type SortMode } from "./LeaderboardPanel";
import EvolutionToast from "./EvolutionToast";
import styles from "./OceanPage.module.css";

export default function OceanPage() {
  // bundled accounts.json renders immediately; the live snapshot (if the
  // pipeline has ever run) overlays it a moment later
  const [liveRoster, setLiveRoster] = useState(() => getRoster());
  const [liveLastUpdated, setLiveLastUpdated] = useState(() => getLastUpdated());
  const [open, setOpen] = useState(false);
  const [weeklyHistory, setWeeklyHistory] =
    useState<WeeklyHistoryPayload | null>(null);
  const [snapshotIndex, setSnapshotIndex] = useState(-1);
  const [snapshotStatus, setSnapshotStatus] =
    useState<"loading" | "ready" | "error">("loading");
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
          setLiveRoster(getRoster(sourceFromLive(live)));
          setLiveLastUpdated(live.lastUpdated);
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

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/history/weekly", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Weekly history is unavailable.");
        return response.json() as Promise<WeeklyHistoryPayload>;
      })
      .then((payload) => {
        setWeeklyHistory(payload);
        setSnapshotStatus("ready");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setSnapshotStatus("error");
      });
    return () => controller.abort();
  }, []);

  const snapshot =
    snapshotIndex >= 0 ? weeklyHistory?.weeks[snapshotIndex] ?? null : null;
  const roster = useMemo(() => {
    if (!snapshot || !weeklyHistory) return liveRoster;
    return getRoster(
      sourceFromWeekly(weeklyHistory, snapshotIndex, liveRoster),
    );
  }, [liveRoster, snapshot, snapshotIndex, weeklyHistory]);
  const lastUpdated = snapshot?.capturedAt ?? liveLastUpdated;
  const [sortMode, setSortMode] = useState<SortMode>("followers");
  // Each leaderboard tab keeps its own range selection, while the currently
  // active range also drives the signed follower change beside every fish.
  const [ranges, setRanges] = useState<Record<SortMode, RangeKey>>({
    followers: "day",
    growth: "week",
  });
  const range = ranges[sortMode];
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusRow, setFocusRow] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const oceanRef = useRef<HTMLDivElement | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const previousSnapshotIndex = useRef(snapshotIndex);
  const pendingDeepLink = useRef<string | null>(null);

  const handleDeselectFish = useCallback(() => {
    pendingDeepLink.current = null;
    setSelected(null);
    setFocusRow(null);
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selected) handleDeselectFish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDeselectFish, selected]);

  useEffect(() => {
    if (selected && !roster.some((entry) => entry.handle === selected)) {
      setSelected(null);
    }
  }, [roster, selected]);

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

  // When time travel moves a selected fish, bind the vertical camera to its
  // animated element for the whole route. A manual wheel/touch/keyboard input
  // immediately releases the camera back to the visitor.
  useEffect(() => {
    const changed = previousSnapshotIndex.current !== snapshotIndex;
    previousSnapshotIndex.current = snapshotIndex;
    if (!changed || !selected) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      scrollToFish(selected);
      return;
    }

    let frame = 0;
    let cancelled = false;
    const started = performance.now();
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    const release = () => {
      if (cancelled) return;
      cancelled = true;
      window.cancelAnimationFrame(frame);
      root.style.scrollBehavior = previousScrollBehavior;
    };
    const follow = (now: number) => {
      if (cancelled) return;
      const fish = document.getElementById(fishDomId(selected));
      if (!fish) return;
      const rect = fish.getBoundingClientRect();
      const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
      if (Math.abs(offset) > 0.5) {
        window.scrollBy({ top: offset, behavior: "auto" });
      }
      if (now - started < SNAPSHOT_SWIM_MS + 180) {
        frame = window.requestAnimationFrame(follow);
      } else {
        release();
      }
    };

    frame = window.requestAnimationFrame(follow);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("keydown", release);
    return () => {
      release();
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", release);
    };
  }, [scrollToFish, selected, snapshotIndex]);

  // Open a shared link (#handle) at the hero. The actual camera handoff waits
  // for the live roster below; otherwise a fish can finish its live-data FLIP
  // migration after the one-shot scroll and leave the viewport behind.
  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (!raw) return;
    const handle = decodeURIComponent(raw);
    if (!roster.some((e) => e.handle === handle)) return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    pendingDeepLink.current = handle;
    setSelected(handle);
    // once, on mount — `roster` here is the bundled data and has every handle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once live data has either landed or failed, bind the camera to the linked
  // fish for the whole migration. This keeps reloads centered even when the
  // bundled fallback and current follower count put it in very different seas.
  useEffect(() => {
    const handle = pendingDeepLink.current;
    if (!rosterSettled || !handle) return;
    pendingDeepLink.current = null;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      const frame = window.requestAnimationFrame(() => scrollToFish(handle));
      return () => window.cancelAnimationFrame(frame);
    }

    let frame = 0;
    let cancelled = false;
    const started = performance.now();
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    const release = () => {
      if (cancelled) return;
      cancelled = true;
      window.cancelAnimationFrame(frame);
      root.style.scrollBehavior = previousScrollBehavior;
    };
    const follow = (now: number) => {
      if (cancelled) return;
      const fish = document.getElementById(fishDomId(handle));
      if (fish) {
        const rect = fish.getBoundingClientRect();
        const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
        if (Math.abs(offset) > 0.5) {
          window.scrollBy({ top: offset, behavior: "auto" });
        }
      }
      if (now - started < SNAPSHOT_SWIM_MS + 240) {
        frame = window.requestAnimationFrame(follow);
      } else {
        release();
      }
    };

    frame = window.requestAnimationFrame(follow);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("keydown", release);
    return () => {
      release();
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", release);
    };
  }, [rosterSettled, scrollToFish]);

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
          <span className={styles.sun}>
            <span className={styles.sunGlint} />
          </span>
          <div className={styles.surface}>
            <span className={styles.wave} data-w="back" />
            <span className={styles.wave} data-w="mid" />
            <span className={styles.wave} data-w="front" />
            <span className={styles.surfaceGlint} />
          </div>
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
        <div
          className={styles.rosterLoading}
          data-ready={rosterSettled || undefined}
          role="status"
          aria-live="polite"
          aria-hidden={rosterSettled}
        >
          <span>loading ocean</span>
          <span className={styles.loadingDots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </div>

        <Clouds />
      </header>

      <main>
        <Ocean
          ref={oceanRef}
          roster={roster}
          hovered={hovered}
          selected={selected}
          onSelectFish={handleSelectFish}
          onDeselectFish={handleDeselectFish}
          swimSeed={swimSeed}
          range={range}
        />
      </main>

      <footer className={styles.floor}>
        <svg
          className={styles.seabedArt}
          viewBox="0 0 1440 360"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className={styles.seabedBack}
            d="M0 112 C150 77 278 91 405 117 C545 146 650 121 775 86 C918 47 1037 73 1162 105 C1273 133 1362 124 1440 97 L1440 360 L0 360 Z"
          />
          <path
            className={styles.seabedGround}
            d="M0 151 C113 126 232 138 340 162 C470 191 596 168 711 139 C842 106 956 112 1081 151 C1212 192 1333 166 1440 137 L1440 360 L0 360 Z"
          />
          <path
            className={styles.seabedLip}
            d="M0 151 C113 126 232 138 340 162 C470 191 596 168 711 139 C842 106 956 112 1081 151 C1212 192 1333 166 1440 137"
          />

          <g className={styles.seabedRocks}>
            <path d="M115 146 C125 111 157 91 194 101 C224 109 240 131 235 153 Z" />
            <path d="M176 139 C184 116 205 108 226 117 C243 125 250 140 246 153 Z" />
            <path d="M1110 150 C1126 107 1167 86 1208 101 C1241 113 1258 137 1254 163 Z" />
            <path d="M1210 155 C1222 127 1249 117 1274 129 C1292 138 1301 153 1298 168 Z" />
            <path d="M658 151 C670 120 699 106 728 116 C751 124 763 143 759 162 Z" />
            <path d="M754 159 C764 137 785 130 805 139 C819 146 827 158 825 169 Z" />
            <ellipse cx="312" cy="166" rx="24" ry="11" />
            <ellipse cx="975" cy="151" rx="31" ry="13" />
            <ellipse cx="1335" cy="159" rx="18" ry="9" />
          </g>
          <g className={styles.seabedRockFaces}>
            <path d="M132 137 C149 109 186 103 211 120 C188 117 163 126 150 145 Z" />
            <path d="M1135 140 C1155 104 1193 99 1224 119 C1193 115 1169 128 1153 150 Z" />
            <path d="M675 144 C690 117 717 114 742 130 C719 126 697 135 686 153 Z" />
          </g>

          <g className={styles.sedimentLines}>
            <path d="M386 194 C442 182 497 184 548 196" />
            <path d="M610 207 C671 194 727 196 778 207" />
            <path d="M840 180 C890 169 936 171 976 181" />
            <path d="M1031 223 C1080 212 1124 214 1161 224" />
            <path d="M207 235 C250 225 289 226 326 236" />
          </g>

          <g className={styles.whaleFall}>
            <path d="M1001 259 C1033 241 1067 239 1099 253" />
            <path d="M1018 252 C1014 233 1020 219 1032 208" />
            <path d="M1038 247 C1036 227 1043 211 1056 200" />
            <path d="M1060 247 C1061 229 1069 215 1082 207" />
            <ellipse cx="996" cy="261" rx="12" ry="9" />
          </g>
        </svg>

        <div className={styles.floorCopy}>
          <h2 className={styles.floorTitle}>The sea floor</h2>
          <p className={styles.floorLine}>
            {roster.length} swimmers and counting.
          </p>
          <p className={styles.floorNote}>
            {snapshot
              ? "Historical follower counts; profile pictures use their current versions."
              : "Live Instagram follower counts, refreshed every four hours."}
          </p>
        </div>
      </footer>

      <DepthGauge oceanRef={oceanRef} />

      <LeaderboardPanel
        open={open}
        onClose={() => setOpen(false)}
        roster={roster}
        lastUpdated={lastUpdated}
        sortMode={sortMode}
        onSortMode={setSortMode}
        range={range}
        onRange={(nextRange) =>
          setRanges((current) => ({
            ...current,
            [sortMode]: nextRange,
          }))
        }
        hovered={hovered}
        onHoverRow={handleHoverRow}
        focusRow={focusRow}
        onFocusRowHandled={() => setFocusRow(null)}
        weeklyHistory={weeklyHistory}
        snapshotIndex={snapshotIndex}
        snapshotStatus={snapshotStatus}
        onSnapshotIndex={setSnapshotIndex}
      />

      {rosterSettled && <EvolutionToast roster={liveRoster} />}
    </div>
  );
}

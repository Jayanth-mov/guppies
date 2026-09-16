"use client";

import { useEffect, useState } from "react";
import type { FishEntry } from "@/lib/roster";
import { formatCount, SPECIES } from "@/lib/species";
import styles from "./EvolutionToast.module.css";

// A depth-map redesign is not a follower-driven evolution. Version the memory
// so returning visitors establish a fresh baseline instead of seeing false
// "grew" / "shrank" notices for the taxonomy change.
const STORAGE_KEY = "guppies.species.v2";

interface Toast {
  id: string;
  handle: string;
  from: string;
  to: string;
  followers: number;
  grew: boolean;
}

function article(species: string): string {
  return /^[aeiou]/i.test(species) ? "an" : "a";
}

// Remembers each swimmer's last-known species in localStorage; when a tier
// crossing shows up on a later load, announces it. Static mock data never
// crosses, so this stays dormant until the pipeline delivers real movement.
export default function EvolutionToast({ roster }: { roster: FishEntry[] }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      const prevRaw = localStorage.getItem(STORAGE_KEY);
      const prev: Record<string, string> | null = prevRaw
        ? JSON.parse(prevRaw)
        : null;

      const next: Record<string, string> = {};
      for (const e of roster) next[e.handle] = e.species.name;

      if (prev) {
        const changed: Toast[] = [];
        for (const e of roster) {
          const old = prev[e.handle];
          if (!old || old === e.species.name) continue;
          const oldIdx = SPECIES.findIndex((s) => s.name === old);
          const grew = oldIdx === -1 || e.speciesIndex > oldIdx;
          changed.push({
            id: e.handle,
            handle: e.handle,
            from: old,
            to: e.species.name,
            followers: e.followers,
            grew,
          });
        }
        if (changed.length) setToasts(changed);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // private mode / storage full — evolution memory just stays off
    }
  }, [roster]);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t, i) =>
      window.setTimeout(
        () => setToasts((cur) => cur.filter((x) => x.id !== t.id)),
        30_000 + i * 50,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [toasts.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toasts.length) return null;

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast} data-grew={t.grew || undefined}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>
              {t.grew ? "New depths unlocked" : "Tier change"}
            </span>
            <strong className={styles.title}>
              @{t.handle} {t.grew ? "graduated" : "changed course"}
            </strong>
            <span className={styles.detail}>
              {t.grew
                ? `${article(t.to)} ${t.to} at ${formatCount(t.followers)} followers`
                : `${article(t.to)} ${t.to} — previously ${article(t.from)} ${t.from}`}
            </span>
          </div>
          <button
            type="button"
            className={styles.dismiss}
            aria-label="Dismiss"
            onClick={() =>
              setToasts((cur) => cur.filter((x) => x.id !== t.id))
            }
          >
            ×
          </button>
          <span className={styles.progress} aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

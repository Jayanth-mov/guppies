"use client";

import { useEffect, useState } from "react";
import type { FishEntry } from "@/lib/roster";
import { SPECIES } from "@/lib/species";
import styles from "./EvolutionToast.module.css";

const STORAGE_KEY = "guppies.species.v1";

interface Toast {
  id: string;
  text: string;
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
            grew,
            text: grew
              ? `@${e.handle} is now ${article(e.species.name)} ${e.species.name}`
              : `@${e.handle} shrank back to ${article(e.species.name)} ${e.species.name}`,
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
        6000 + i * 500,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [toasts.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toasts.length) return null;

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast} data-grew={t.grew || undefined}>
          <span className={styles.icon} aria-hidden="true">
            {t.grew ? "▼" : "▲"}
          </span>
          {t.text}
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
        </div>
      ))}
    </div>
  );
}

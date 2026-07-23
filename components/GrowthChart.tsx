"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildSeries,
  sliceHistory,
  niceTicks,
  CHART_RANGES,
  RANGE_LABEL,
  type ChartMetric,
  type ChartRange,
  type Snapshot,
} from "@/lib/chart";
import { formatCount } from "@/lib/species";
import styles from "./GrowthChart.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PAD = { l: 54, r: 16, t: 16, b: 30 };

export default function GrowthChart({ open, onClose }: Props) {
  const [history, setHistory] = useState<Snapshot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<ChartRange>("week");
  const [metric, setMetric] = useState<ChartMetric>("growth");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 760, h: 400 });

  useEffect(() => {
    if (!open || history) return;
    setLoading(true);
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setHistory(d.points ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [open, history]);

  useEffect(() => {
    if (!open) return;
    const el = plotRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sliced = useMemo(
    () => (history ? sliceHistory(history, range) : []),
    [history, range],
  );
  const series = useMemo(() => buildSeries(sliced, metric), [sliced, metric]);
  const visible = useMemo(
    () => series.filter((s) => !hidden.has(s.handle)),
    [series, hidden],
  );

  const g = useMemo(() => {
    const { w, h } = size;
    const iw = Math.max(10, w - PAD.l - PAD.r);
    const ih = Math.max(10, h - PAD.t - PAD.b);
    let tMin = Infinity,
      tMax = -Infinity,
      vMin = Infinity,
      vMax = -Infinity;
    for (const s of visible)
      for (const p of s.points) {
        if (p.t < tMin) tMin = p.t;
        if (p.t > tMax) tMax = p.t;
        if (p.v < vMin) vMin = p.v;
        if (p.v > vMax) vMax = p.v;
      }
    if (!isFinite(tMin)) {
      tMax = Date.now();
      tMin = tMax - 6.048e8;
    }
    if (!isFinite(vMin)) {
      vMin = 0;
      vMax = 1;
    }
    if (metric === "growth") {
      vMin = Math.min(vMin, 0);
      vMax = Math.max(vMax, 1);
      const p = (vMax - vMin) * 0.08 || 1;
      vMin -= p;
      vMax += p;
    } else {
      vMin = Math.max(1, vMin);
      if (vMax <= vMin) vMax = vMin * 1.2;
    }
    const x = (t: number) => PAD.l + ((t - tMin) / (tMax - tMin || 1)) * iw;
    const lmin = Math.log(vMin);
    const lmax = Math.log(vMax);
    const y = (v: number) =>
      metric === "followers"
        ? PAD.t + ih - ((Math.log(Math.max(1, v)) - lmin) / (lmax - lmin || 1)) * ih
        : PAD.t + ih - ((v - vMin) / (vMax - vMin || 1)) * ih;
    return { w, h, iw, ih, tMin, tMax, vMin, vMax, x, y };
  }, [visible, size, metric]);

  const yTicks = useMemo(() => {
    if (metric === "growth") return niceTicks(g.vMin, g.vMax, 5);
    const ticks: number[] = [];
    for (let k = 0; k <= 6; k++) {
      for (const m of [1, 2, 5]) {
        const v = m * Math.pow(10, k);
        if (v >= g.vMin && v <= g.vMax) ticks.push(v);
      }
    }
    return ticks.length ? ticks : [g.vMin, g.vMax];
  }, [g, metric]);

  const xTicks = useMemo(() => {
    const span = g.tMax - g.tMin;
    const n = Math.min(6, Math.max(2, Math.round(g.iw / 110)));
    const out: number[] = [];
    for (let i = 0; i <= n; i++) out.push(g.tMin + (span * i) / n);
    return out;
  }, [g]);

  const fmtTime = (t: number) => {
    const span = g.tMax - g.tMin;
    const d = new Date(t);
    if (span <= 2 * 864e5)
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const fmtVal = (v: number) =>
    metric === "growth" ? `${v >= 0 ? "+" : ""}${v.toFixed(0)}%` : formatCount(v);

  const path = (pts: { t: number; v: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${g.x(p.t).toFixed(1)} ${g.y(p.v).toFixed(1)}`).join(" ");

  const nearestT = useMemo(() => {
    if (hoverT == null || !sliced.length) return null;
    let best = sliced[0].t,
      bd = Infinity;
    for (const s of sliced) {
      const tt = new Date(s.t).getTime();
      const d = Math.abs(tt - hoverT);
      if (d < bd) {
        bd = d;
        best = s.t;
      }
    }
    return new Date(best).getTime();
  }, [hoverT, sliced]);

  const valueAt = (pts: { t: number; v: number }[], t: number) => {
    let best = pts[0],
      bd = Infinity;
    for (const p of pts) {
      const d = Math.abs(p.t - t);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best?.v;
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    if (px < PAD.l || px > g.w - PAD.r) {
      setHoverT(null);
      return;
    }
    setHoverT(g.tMin + ((px - PAD.l) / g.iw) * (g.tMax - g.tMin));
  };

  const toggle = (h: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(h)) n.delete(h);
      else n.add(h);
      return n;
    });

  const hasData = sliced.length >= 2;
  const tooltipRows =
    nearestT != null
      ? visible
          .map((s) => ({ s, v: valueAt(s.points, nearestT) }))
          .filter((r) => r.v !== undefined)
          .sort((a, b) => (b.v as number) - (a.v as number))
          .slice(0, 12)
      : [];

  return (
    <section className={styles.modal} data-open={open || undefined} aria-label="Growth chart" inert={!open}>
      <header className={styles.head}>
        <h2 className={styles.title}>Follower growth</h2>
        <div className={styles.controls}>
          <div className={styles.seg} role="group" aria-label="Metric">
            <button data-on={metric === "growth" || undefined} onClick={() => setMetric("growth")}>
              Growth %
            </button>
            <button data-on={metric === "followers" || undefined} onClick={() => setMetric("followers")}>
              Followers
            </button>
          </div>
          <div className={styles.seg} role="group" aria-label="Range">
            {CHART_RANGES.map((r) => (
              <button key={r} data-on={range === r || undefined} onClick={() => setRange(r)}>
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Close chart">
          ×
        </button>
      </header>

      <div className={styles.plotWrap}>
        <div className={styles.plot} ref={plotRef}>
          {loading && <p className={styles.note}>loading history…</p>}
          {!loading && !hasData && (
            <p className={styles.note}>
              Growth history builds over time — check back in a few days.
            </p>
          )}
          {hasData && (
            <svg
              className={styles.svg}
              width={g.w}
              height={g.h}
              onMouseMove={onMove}
              onMouseLeave={() => setHoverT(null)}
            >
              {yTicks.map((v, i) => (
                <g key={i}>
                  <line
                    className={styles.grid}
                    x1={PAD.l}
                    x2={g.w - PAD.r}
                    y1={g.y(v)}
                    y2={g.y(v)}
                  />
                  <text className={styles.axis} x={PAD.l - 8} y={g.y(v) + 3} textAnchor="end">
                    {fmtVal(v)}
                  </text>
                </g>
              ))}
              {xTicks.map((t, i) => (
                <text
                  key={i}
                  className={styles.axis}
                  x={g.x(t)}
                  y={g.h - PAD.b + 18}
                  textAnchor="middle"
                >
                  {fmtTime(t)}
                </text>
              ))}

              {visible.map((s) => (
                <path
                  key={s.handle}
                  className={styles.line}
                  d={path(s.points)}
                  stroke={s.color}
                  data-dim={focus && focus !== s.handle ? true : undefined}
                  data-hot={focus === s.handle || undefined}
                />
              ))}

              {nearestT != null && (
                <>
                  <line
                    className={styles.crosshair}
                    x1={g.x(nearestT)}
                    x2={g.x(nearestT)}
                    y1={PAD.t}
                    y2={g.h - PAD.b}
                  />
                  {visible.map((s) => {
                    const v = valueAt(s.points, nearestT);
                    return v === undefined ? null : (
                      <circle
                        key={s.handle}
                        cx={g.x(nearestT)}
                        cy={g.y(v)}
                        r={focus === s.handle ? 4 : 2.6}
                        fill={s.color}
                      />
                    );
                  })}
                </>
              )}
            </svg>
          )}

          {hasData && nearestT != null && tooltipRows.length > 0 && (
            <div
              className={styles.tooltip}
              style={{
                left: Math.min(g.x(nearestT) + 12, g.w - 168),
                top: PAD.t + 6,
              }}
            >
              <div className={styles.tipTime}>{fmtTime(nearestT)}</div>
              {tooltipRows.map(({ s, v }) => (
                <div key={s.handle} className={styles.tipRow}>
                  <i style={{ background: s.color }} />
                  <span className={styles.tipHandle}>{s.handle}</span>
                  <span className={styles.tipVal}>{fmtVal(v as number)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {hasData && (
          <div className={styles.legend}>
            {series.map((s) => (
              <button
                key={s.handle}
                className={styles.chip}
                data-off={hidden.has(s.handle) || undefined}
                onMouseEnter={() => setFocus(s.handle)}
                onMouseLeave={() => setFocus(null)}
                onClick={() => toggle(s.handle)}
              >
                <i style={{ background: s.color }} />
                {s.handle}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

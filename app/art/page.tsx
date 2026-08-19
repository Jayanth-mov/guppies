import { BAND_COLORS, SPECIES, formatRange, paleInk } from "@/lib/species";
import { FISH_SHAPES } from "@/components/FishShapes";

export const metadata = { title: "guppies — art board" };

// Dev artboard: all 13 silhouettes at species-locked sizes, on a shallow and
// an abyss swatch, for eyeballing the shapes without diving the whole ocean.
export default function ArtBoard() {
  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 0,
        minHeight: "100vh",
        background: "#0b2a44",
      }}
    >
      {SPECIES.map((s, i) => {
        const shape = FISH_SHAPES[s.symbolId];
        const pale = paleInk(i);
        return (
          <div
            key={s.symbolId}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 12,
              background: BAND_COLORS[i],
              color: pale ? "#c6e4f4" : "#123a5c",
              minHeight: 170,
            }}
          >
            <svg
              viewBox={shape.viewBox}
              style={{
                width: Math.min(s.width, 280),
                aspectRatio: `${shape.w} / ${shape.h}`,
                overflow: "visible",
                ["--detail" as string]: pale
                  ? "rgba(6, 26, 46, 0.55)"
                  : "rgba(255, 255, 255, 0.55)",
                ["--orca-body" as string]: "#123a5c",
                ["--orca-mark" as string]: "#c6e4f4",
                ["--orca-saddle" as string]: "#c6e4f4",
              }}
            >
              <g fill="currentColor">{shape.tail}</g>
              <g fill="currentColor">{shape.body}</g>
            </svg>
            <span style={{ fontSize: 13, fontFamily: "monospace" }}>
              {s.name} · {formatRange(s)}
            </span>
          </div>
        );
      })}
    </main>
  );
}

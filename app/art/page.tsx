import { SPECIES, formatRange } from "@/lib/species";
import { FISH_SHAPES } from "@/components/FishShapes";

export const metadata = { title: "guppies — art board" };

// Dev artboard: all 12 silhouettes at species-locked sizes, on a shallow and
// an abyss swatch, for eyeballing the shapes without diving the whole ocean.
export default function ArtBoard() {
  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0,
        minHeight: "100vh",
        background: "#0b2a44",
      }}
    >
      {SPECIES.map((s, i) => {
        const shape = FISH_SHAPES[s.symbolId];
        const pale = i >= 6;
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
              background: pale ? "#0e3358" : "#8acdea",
              color: pale ? "#c6e4f4" : "#123a5c",
              minHeight: 170,
            }}
          >
            <svg
              viewBox={shape.viewBox}
              style={{
                width: Math.min(s.width, 210),
                aspectRatio: `${shape.w} / ${shape.h}`,
                overflow: "visible",
                ["--detail" as string]: pale
                  ? "rgba(6, 26, 46, 0.55)"
                  : "rgba(255, 255, 255, 0.55)",
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

import { ImageResponse } from "next/og";

export const alt = "The Guppies creator leaderboard above a lively blue ocean";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface FishProps {
  color?: string;
  flip?: boolean;
  left: number;
  top: number;
  width: number;
}

function Fish({ color = "#c6e4f4", flip = false, left, top, width }: FishProps) {
  const height = Math.round(width * 0.48);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 124 60"
      style={{
        position: "absolute",
        left,
        top,
        ...(flip ? { transform: "scaleX(-1)" } : {}),
      }}
    >
      <path
        d="M8 30 C24 7 66 5 94 30 C66 55 24 53 8 30 Z"
        fill={color}
      />
      <path d="M91 30 L122 8 L113 30 L122 52 Z" fill={color} />
      <path d="M54 11 L69 0 L77 14 Z" fill={color} opacity="0.78" />
      <circle cx="26" cy="25" r="2.7" fill="#061a2e" />
      <path
        d="M31 39 C45 46 63 45 76 37"
        fill="none"
        stroke="#061a2e"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.42"
      />
    </svg>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        overflow: "hidden",
        background: "#9ed9f1",
        color: "#082b49",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 318,
          display: "flex",
          background:
            "linear-gradient(180deg, #68b8e5 0%, #bce8f7 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 310,
          bottom: 0,
          display: "flex",
          background:
            "linear-gradient(180deg, #2e86be 0%, #144773 56%, #08203c 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 142,
          height: 142,
          right: 112,
          top: 58,
          borderRadius: "50%",
          display: "flex",
          background: "#fff5ce",
          border: "14px solid rgba(255,255,255,0.26)",
        }}
      />

      <svg
        width="1200"
        height="86"
        viewBox="0 0 1200 86"
        preserveAspectRatio="none"
        style={{ position: "absolute", left: 0, top: 271 }}
      >
        <path
          d="M0 45 C90 8 175 12 260 43 C350 76 438 75 526 40 C617 4 704 13 790 45 C878 78 962 75 1043 43 C1103 19 1154 18 1200 35 L1200 86 L0 86 Z"
          fill="#bfe6f5"
          opacity="0.92"
        />
        <path
          d="M0 58 C102 32 188 37 281 59 C373 81 458 79 549 54 C644 28 726 36 816 59 C907 82 998 79 1083 55 C1127 43 1165 41 1200 49 L1200 86 L0 86 Z"
          fill="#e9f7ff"
          opacity="0.82"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: 78,
          top: 50,
          display: "flex",
          fontSize: 22,
          letterSpacing: "0.28em",
          fontWeight: 700,
          color: "#155071",
        }}
      >
        GUPPIES.JAYANTH.MOV
      </div>
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 82,
          display: "flex",
          fontSize: 122,
          lineHeight: 1,
          letterSpacing: "-0.045em",
          fontWeight: 700,
          color: "#082b49",
        }}
      >
        guppies
      </div>
      <div
        style={{
          position: "absolute",
          left: 78,
          top: 217,
          display: "flex",
          fontSize: 30,
          fontWeight: 500,
          color: "#174a67",
        }}
      >
        An ocean of creators. Bigger fish live deeper.
      </div>

      <Fish left={98} top={380} width={114} />
      <Fish left={330} top={454} width={164} flip color="#9ccce2" />
      <Fish left={660} top={365} width={138} color="#c6e4f4" />
      <Fish left={890} top={475} width={202} flip color="#7fb5d2" />
      <Fish left={520} top={544} width={92} color="#a8d5e8" />

      {[150, 265, 578, 820, 1035].map((left, index) => (
        <div
          key={left}
          style={{
            position: "absolute",
            left,
            top: 355 + (index % 3) * 72,
            width: 7 + (index % 2) * 4,
            height: 7 + (index % 2) * 4,
            borderRadius: "50%",
            display: "flex",
            border: "2px solid rgba(210,240,250,0.55)",
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          right: 72,
          bottom: 38,
          display: "flex",
          padding: "10px 18px",
          borderRadius: 999,
          background: "rgba(3, 17, 34, 0.58)",
          border: "1px solid rgba(108,245,226,0.38)",
          color: "#d7f0f7",
          fontSize: 19,
          letterSpacing: "0.06em",
        }}
      >
        scroll to dive ↓
      </div>
    </div>,
    size,
  );
}

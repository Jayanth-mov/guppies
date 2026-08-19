import type { ReactNode } from "react";

// The art budget lives here: every active silhouette is drawn facing right
// (head at high x, tail trailing left). `tail` is separate from `body` so the
// Fish component can wrap it in a wagging <g>. Fills use currentColor so depth
// decides the silhouette color; accents (eyes, stripes, spots, gills) use
// var(--detail) so they flip contrast with the band. Species whose markings
// define their identity (notably the orca) use dedicated color variables.

export interface FishShape {
  viewBox: string;
  w: number;
  h: number;
  /** Avatar anchor near the head, in viewBox coords. */
  head: [number, number];
  tail: ReactNode;
  body: ReactNode;
}

export const FISH_SHAPES: Record<string, FishShape> = {
  guppy: {
    viewBox: "0 0 100 60",
    w: 100,
    h: 60,
    head: [84, 27],
    // the fan tail is nearly as big as the fish — that's the guppy
    tail: (
      <path d="M50 30 C40 14 24 6 8 9 C15 18 17 25 16 30 C17 35 15 42 8 51 C24 54 40 46 50 30 Z" />
    ),
    body: (
      <>
        <path d="M96 30 C93 21 84 15 72 15 C60 15 50 21 46 30 C50 39 60 45 72 45 C84 45 93 39 96 30 Z" />
        <path d="M70 16 C67 8 58 6 51 9 C56 12 60 14 62 17 Z" />
        <circle cx="86" cy="27" r="2.4" fill="var(--detail)" />
      </>
    ),
  },

  clownfish: {
    viewBox: "0 0 100 62",
    w: 100,
    h: 62,
    head: [84, 28],
    tail: (
      <path d="M28 31 C20 22 11 19 4 21 C8 26 10 29 10 31 C10 33 8 36 4 41 C11 43 20 40 28 31 Z" />
    ),
    body: (
      <>
        <path d="M95 31 C90 18 76 11 60 11 C43 11 29 20 25 31 C29 42 43 51 60 51 C76 51 90 44 95 31 Z" />
        <path d="M74 13 C72 5 60 2 51 6 C56 9 60 11 63 14 Z" />
        <path d="M66 44 C63 51 57 54 51 54 C55 49 57 45 58 42 Z" />
        {/* the two white bands make the silhouette read instantly */}
        <path
          d="M78 14 C74 24 74 37 78 48 C81 46 84 44 86 42 C84 34 84 27 86 20 C84 18 81 16 78 14 Z"
          fill="var(--detail)"
        />
        <path
          d="M52 12 C48 24 48 38 52 50 C56 50 59 49 62 48 C59 37 59 25 62 13 C59 12 56 12 52 12 Z"
          fill="var(--detail)"
        />
        <circle cx="88" cy="26" r="2.4" fill="var(--detail)" />
      </>
    ),
  },

  goldfish: {
    viewBox: "0 0 100 64",
    w: 100,
    h: 64,
    head: [82, 28],
    // flowing double tail
    tail: (
      <path d="M34 32 C27 20 15 11 4 13 C10 20 13 26 12 31 C9 30 5 31 2 33 C5 34 9 35 12 34 C13 39 10 46 4 52 C15 53 27 44 34 32 Z" />
    ),
    body: (
      <>
        <path d="M94 32 C90 18 77 10 62 10 C46 10 34 20 30 32 C34 44 46 54 62 54 C77 54 90 46 94 32 Z" />
        <path d="M68 11 C66 2 54 0 45 5 C51 8 56 10 59 13 Z" />
        <path d="M58 52 C55 59 49 62 43 61 C47 57 50 53 51 50 Z" />
        <circle cx="83" cy="27" r="2.8" fill="var(--detail)" />
      </>
    ),
  },

  salmon: {
    viewBox: "0 0 156 52",
    w: 156,
    h: 52,
    head: [134, 24],
    tail: (
      <g transform="scale(1.2 1)">
        <path d="M30 28 C22 20 12 15 4 15 C9 20 11 25 11 28 C11 31 9 36 4 41 C12 41 22 36 30 28 Z" />
      </g>
    ),
    body: (
      <g transform="scale(1.2 1)">
        {/* humped back, hooked jaw */}
        <path d="M127 28 C124 22 118 18 110 15 C100 8 80 5 62 8 C46 11 32 19 26 28 C34 37 52 44 74 44 C96 44 118 37 127 30 C128 29 128 29 127 28 Z" />
        <path d="M127 29 C129 32 127 35 122 37 C122 34 123 31 124 29 Z" />
        <path d="M74 8 C72 2 62 0 55 3 C60 5 64 7 66 9 Z" />
        <path d="M84 43 C82 48 76 51 70 50 C74 47 77 44 78 41 Z" />
        <circle cx="114" cy="22" r="2.4" fill="var(--detail)" />
      </g>
    ),
  },

  swordfish: {
    viewBox: "0 0 170 62",
    w: 170,
    h: 62,
    head: [112, 25],
    tail: (
      <path d="M40 30 C31 19 21 11 9 7 C15 16 18 24 18 30 C18 36 15 44 9 53 C21 49 31 41 40 32 Z" />
    ),
    body: (
      <>
        {/* the bill */}
        <path d="M122 27 L167 28 C168 28.6 168 29.4 167 30 L122 32 Z" />
        <path d="M126 30 C118 17 98 11 78 13 C60 15 45 22 38 30 C45 38 60 44 78 45 C98 46 116 41 126 31 Z" />
        {/* sickle dorsal */}
        <path d="M92 14 C93 4 83 1 71 4 C79 7 85 10 88 15 Z" />
        <path d="M98 42 C94 50 86 54 78 53 C84 48 88 44 90 40 Z" />
        <circle cx="115" cy="25" r="2.4" fill="var(--detail)" />
      </>
    ),
  },

  manta: {
    viewBox: "0 0 180 92",
    w: 180,
    h: 92,
    head: [146, 46],
    // the whip tail
    tail: (
      <path d="M68 44 C48 44 24 44 8 45 L8 47 C24 48 48 48 68 48 Z" />
    ),
    body: (
      <>
        {/* wingspan silhouette with cephalic lobes at the head */}
        <path d="M146 38 C152 35 157 31 160 25 C153 25 147 28 143 31 C122 21 100 12 86 5 C82 21 76 33 68 39 C64 42 64 50 68 53 C76 59 82 71 86 87 C100 80 122 71 143 61 C147 64 153 67 160 67 C157 61 152 57 146 54 C151 50 151 42 146 38 Z" />
        <circle cx="146" cy="42" r="1.8" fill="var(--detail)" />
      </>
    ),
  },

  greatwhite: {
    viewBox: "0 0 160 72",
    w: 160,
    h: 72,
    head: [138, 32],
    // heterocercal crescent — top lobe bigger
    tail: (
      <path d="M42 38 C34 27 26 17 15 10 C19 21 21 31 20 38 C21 44 19 53 13 61 C23 56 33 48 42 40 Z" />
    ),
    body: (
      <>
        <path d="M157 39 C148 28 126 21 102 21 C76 21 52 28 38 38 C52 47 76 53 100 53 C126 53 148 47 157 42 C158 41 158 40 157 39 Z" />
        {/* the dorsal fin */}
        <path d="M98 22 C96 8 88 2 78 2 C84 9 88 16 88 22 Z" />
        <path d="M54 25 C53 20 49 18 45 19 C48 21 50 23 51 26 Z" />
        <path d="M110 51 C106 61 98 67 88 67 C94 59 98 54 100 49 Z" />
        <path d="M120 26 C118 30 118 36 120 40" fill="none" stroke="var(--detail)" strokeWidth="1.4" />
        <path d="M126 25 C124 30 124 36 126 41" fill="none" stroke="var(--detail)" strokeWidth="1.4" />
        <path d="M132 25 C130 30 130 35 132 40" fill="none" stroke="var(--detail)" strokeWidth="1.4" />
        <circle cx="142" cy="31" r="2.2" fill="var(--detail)" />
      </>
    ),
  },

  whaleshark: {
    viewBox: "0 0 220 84",
    w: 220,
    h: 84,
    head: [196, 32],
    tail: (
      <path d="M38 42 C30 28 22 17 10 8 C15 21 18 34 17 42 C18 50 15 63 10 76 C22 66 30 55 38 44 Z" />
    ),
    body: (
      <>
        {/* broad, blunt-headed bus of a fish */}
        <path d="M213 26 C176 15 124 13 86 19 C56 24 40 32 32 42 C40 52 60 60 92 63 C134 67 184 61 208 51 C214 48 216 44 216 40 C216 33 215 29 213 26 Z" />
        <path d="M122 18 C120 5 109 1 99 3 C105 9 109 14 110 19 Z" />
        <path d="M62 24 C61 18 56 16 51 18 C54 20 56 22 57 25 Z" />
        <path d="M138 60 C133 70 124 75 113 74 C120 66 124 61 126 56 Z" />
        {/* ridge lines along the back */}
        <path d="M204 30 C160 22 110 20 78 26" fill="none" stroke="var(--detail)" strokeWidth="1.4" opacity="0.8" />
        <path d="M208 38 C168 32 118 30 84 36" fill="none" stroke="var(--detail)" strokeWidth="1.4" opacity="0.8" />
        {/* the constellation of spots */}
        {[
          [180, 26], [168, 32], [190, 34], [156, 24], [144, 30], [132, 26],
          [120, 32], [108, 28], [96, 34], [150, 40], [170, 44], [130, 44],
          [110, 40], [90, 44], [160, 52], [140, 52], [184, 46], [118, 50],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" fill="var(--detail)" />
        ))}
        <circle cx="203" cy="30" r="1.7" fill="var(--detail)" />
      </>
    ),
  },

  giantsquid: {
    viewBox: "0 0 250 112",
    w: 250,
    h: 112,
    head: [148, 48],
    // A loose bundle of arms and two long feeding tentacles trails behind.
    tail: (
      <>
        <path d="M116 43 C89 31 67 21 42 20 C60 29 75 39 91 51 C61 42 32 40 8 45 C38 49 66 57 93 63 C65 64 38 71 17 83 C48 76 79 72 116 66 Z" />
        <path d="M112 50 C78 47 42 51 6 63 C47 57 80 58 116 61 Z" />
        <path d="M113 59 C80 69 49 82 24 101 C58 84 87 76 120 68 Z" />
      </>
    ),
    body: (
      <>
        {/* Eye-bearing head in front of a pointed, finned mantle. */}
        <path d="M108 55 C115 40 130 32 147 33 C163 34 174 43 178 55 C174 68 163 77 147 78 C130 79 115 70 108 55 Z" />
        <path d="M151 36 C181 27 216 31 244 55 C216 80 181 84 151 75 C165 62 165 48 151 36 Z" />
        <path d="M132 72 C124 82 115 85 106 82 C114 75 118 68 119 61 Z" />
        <ellipse cx="143" cy="47" rx="6" ry="7.5" fill="var(--detail)" />
        <circle cx="144" cy="46" r="2" />
        <path d="M123 58 C119 64 114 67 109 66" fill="none" stroke="var(--detail)" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },

  humpback: {
    viewBox: "0 0 280 120",
    w: 280,
    h: 120,
    head: [249, 48],
    tail: (
      <>
        <path d="M55 58 C38 51 23 38 7 27 C14 43 18 53 20 61 C32 63 44 62 55 60 Z" />
        <path d="M55 61 C39 69 23 84 8 97 C15 79 19 69 20 61 C32 59 44 59 55 61 Z" />
      </>
    ),
    body: (
      <>
        {/* Arched back, knuckled snout, and extremely long pectoral fin. */}
        <path d="M271 55 C266 38 246 29 220 27 C197 19 165 15 132 18 C96 21 68 34 49 58 C68 80 102 91 144 91 C187 91 230 80 260 67 C269 63 273 59 271 55 Z" />
        <path d="M124 20 C118 11 108 9 99 13 C108 15 114 18 117 22 Z" />
        <path d="M176 78 C166 95 147 110 126 116 C136 99 145 85 151 74 Z" />
        <path d="M249 36 C255 31 261 32 266 37 C259 38 254 40 250 43 Z" />
        <circle cx="249" cy="43" r="2.4" fill="var(--detail)" />
        {[0, 1, 2, 3].map((line) => (
          <path
            key={line}
            d={`M${216 - line * 9} ${61 + line * 2} C${224 - line * 8} ${70 + line * 2} ${236 - line * 7} ${72 + line * 2} ${248 - line * 6} ${68 + line}`}
            fill="none"
            stroke="var(--detail)"
            strokeWidth="1.5"
            opacity="0.7"
          />
        ))}
      </>
    ),
  },

  orca: {
    viewBox: "0 0 300 124",
    w: 300,
    h: 124,
    head: [274, 48],
    tail: (
      <>
        <path
          d="M58 60 C40 52 23 37 7 24 C15 43 20 54 22 61 C34 63 47 62 58 62 Z"
          fill="var(--orca-body)"
        />
        <path
          d="M58 63 C40 72 23 88 7 101 C15 82 20 70 22 63 C34 61 47 61 58 63 Z"
          fill="var(--orca-body)"
        />
        <path
          d="M38 72 C27 80 19 89 12 96 C18 83 22 76 27 70 C31 70 35 71 38 72 Z"
          fill="var(--orca-mark)"
          opacity="0.92"
        />
      </>
    ),
    body: (
      <>
        {/* Black, robust dolphin body with a blunt melon and narrow peduncle. */}
        <path
          d="M295 54 C288 35 260 24 220 22 C177 20 120 30 53 62 C103 92 160 106 214 100 C255 96 284 78 295 67 C299 63 299 58 295 54 Z"
          fill="var(--orca-body)"
        />
        {/* Continuous white jaw and ventral field, interrupted by the flipper. */}
        <path
          d="M294 62 C280 65 266 72 251 81 C228 93 207 95 181 92 C145 89 114 78 88 67 C103 88 134 100 176 103 C221 106 261 90 285 73 C290 69 293 65 294 62 Z"
          fill="var(--orca-mark)"
        />
        {/* The gray saddle sits immediately behind the dorsal fin. */}
        <path
          d="M141 24 C128 25 116 28 104 33 C116 35 127 38 140 41 C146 36 147 29 141 24 Z"
          fill="var(--orca-saddle)"
        />
        {/* Tall dorsal fin and long, paddle-shaped pectoral flipper. */}
        <path
          d="M169 28 C165 7 153 -3 139 3 C149 12 154 21 155 30 Z"
          fill="var(--orca-body)"
        />
        <path
          d="M181 85 C169 104 151 117 130 121 C145 102 152 90 155 78 Z"
          fill="var(--orca-body)"
        />
        {/* Large post-ocular patch: above and behind the true eye. */}
        <path
          d="M246 35 C262 30 278 34 285 43 C272 44 258 50 247 56 C238 51 238 40 246 35 Z"
          fill="var(--orca-mark)"
        />
        <circle cx="278" cy="51" r="1.9" fill="var(--orca-mark)" />
      </>
    ),
  },

  bluewhale: {
    viewBox: "0 0 330 112",
    w: 330,
    h: 112,
    head: [298, 47],
    tail: (
      <>
        <path d="M58 55 C39 48 23 35 7 25 C15 41 19 51 21 57 C33 59 46 58 58 57 Z" />
        <path d="M58 58 C40 66 23 80 7 91 C15 75 19 65 21 58 C33 56 46 56 58 58 Z" />
      </>
    ),
    body: (
      <>
        {/* Long, low rostrum and tiny dorsal fin: the largest real animal. */}
        <path d="M322 54 C315 36 284 28 239 27 C185 23 120 29 54 57 C112 80 180 86 239 82 C282 79 313 68 323 59 C325 57 324 55 322 54 Z" />
        <path d="M137 32 C134 23 127 20 119 22 C126 26 130 29 131 33 Z" />
        <path d="M184 79 C174 91 161 98 147 99 C157 88 162 81 165 75 Z" />
        <circle cx="300" cy="45" r="2.2" fill="var(--detail)" />
        {[0, 1, 2, 3, 4].map((line) => (
          <path
            key={line}
            d={`M${245 - line * 15} ${61 + line} C${263 - line * 14} ${69 + line} ${286 - line * 11} ${69 + line} ${308 - line * 8} ${62 + line}`}
            fill="none"
            stroke="var(--detail)"
            strokeWidth="1.4"
            opacity="0.68"
          />
        ))}
      </>
    ),
  },

  leviathan: {
    viewBox: "0 0 380 150",
    w: 380,
    h: 150,
    head: [342, 58],
    tail: (
      <>
        <path d="M68 73 C45 62 27 43 8 25 C18 49 23 65 24 75 C38 79 53 77 68 75 Z" />
        <path d="M68 76 C47 89 28 111 10 132 C19 104 23 87 24 76 C38 73 53 73 68 76 Z" />
      </>
    ),
    body: (
      <>
        {/* A whale-serpent final boss: armored spine, hooked jaw, and scars. */}
        <path d="M365 70 C355 42 322 31 281 32 C246 16 202 14 158 22 C117 29 82 47 59 75 C84 104 128 119 181 119 C236 119 296 103 343 88 C361 82 370 76 365 70 Z" />
        <path d="M349 69 L377 75 L348 85 C350 79 350 74 349 69 Z" />
        {[
          [260, 35, 277, 8, 288, 38],
          [229, 29, 241, 3, 252, 34],
          [197, 25, 206, 4, 219, 31],
          [166, 25, 173, 8, 190, 31],
          [136, 31, 141, 16, 158, 34],
        ].map(([x1, y1, x2, y2, x3, y3]) => (
          <path key={`${x1}-${y1}`} d={`M${x1} ${y1} C${x2} ${y2} ${x2} ${y2} ${x3} ${y3} Z`} />
        ))}
        <path d="M244 107 C228 130 204 143 178 143 C197 125 207 112 213 99 Z" />
        <path d="M304 40 C315 30 329 31 338 40 C326 42 316 48 309 55 Z" />
        <circle cx="337" cy="56" r="4.2" fill="var(--detail)" />
        <circle cx="338" cy="55" r="1.6" />
        <path d="M319 75 C334 80 348 80 363 75" fill="none" stroke="var(--detail)" strokeWidth="2" strokeLinecap="round" />
        {[0, 1, 2, 3].map((tooth) => (
          <path key={tooth} d={`M${332 + tooth * 7} ${77 + (tooth % 2)} l3 6 l3 -5 Z`} fill="var(--detail)" />
        ))}
        <path d="M286 55 l-15 28 M272 52 l-15 27 M257 50 l-14 25" fill="none" stroke="var(--detail)" strokeWidth="2" opacity="0.65" />
      </>
    ),
  },
};

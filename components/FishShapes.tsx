import type { ReactNode } from "react";

// The art budget lives here: 12 distinct silhouettes, each drawn facing right
// (head at high x, tail trailing left). `tail` is separate from `body` so the
// Fish component can wrap it in a wagging <g>. Fills use currentColor so depth
// decides the silhouette color; accents (eyes, stripes, spots, gills) use
// var(--detail) so they flip contrast with the band.

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

  trout: {
    viewBox: "0 0 120 44",
    w: 120,
    h: 44,
    head: [104, 19],
    tail: (
      <path d="M28 22 C20 14 11 10 4 10 C8 15 10 19 10 22 C10 25 8 29 4 34 C11 34 20 30 28 22 Z" />
    ),
    body: (
      <>
        <path d="M117 22 C110 13 90 8 68 9 C48 10 32 15 25 22 C32 29 48 34 68 35 C90 36 110 31 117 22 Z" />
        <path d="M70 9 C68 3 58 1 51 4 C56 6 60 8 62 10 Z" />
        {/* adipose fin — the trout tell */}
        <path d="M42 11 C43 8 47 8 48 11 Z" />
        <path d="M56 34 C54 39 49 41 44 41 C47 37 49 35 50 32 Z" />
        <circle cx="107" cy="19" r="2.2" fill="var(--detail)" />
      </>
    ),
  },

  sockeye: {
    viewBox: "0 0 130 52",
    w: 130,
    h: 52,
    head: [112, 24],
    tail: (
      <path d="M30 28 C22 20 12 15 4 15 C9 20 11 25 11 28 C11 31 9 36 4 41 C12 41 22 36 30 28 Z" />
    ),
    body: (
      <>
        {/* humped back, hooked jaw */}
        <path d="M127 28 C124 22 118 18 110 15 C100 8 80 5 62 8 C46 11 32 19 26 28 C34 37 52 44 74 44 C96 44 118 37 127 30 C128 29 128 29 127 28 Z" />
        <path d="M127 29 C129 32 127 35 122 37 C122 34 123 31 124 29 Z" />
        <path d="M74 8 C72 2 62 0 55 3 C60 5 64 7 66 9 Z" />
        <path d="M84 43 C82 48 76 51 70 50 C74 47 77 44 78 41 Z" />
        <circle cx="114" cy="22" r="2.4" fill="var(--detail)" />
      </>
    ),
  },

  cod: {
    viewBox: "0 0 140 54",
    w: 140,
    h: 54,
    head: [122, 23],
    tail: (
      <path d="M32 27 C24 21 14 18 5 19 C8 23 9 25 9 27 C9 29 8 31 5 35 C14 36 24 33 32 27 Z" />
    ),
    body: (
      <>
        <path d="M134 27 C128 18 108 12 84 12 C60 12 40 18 30 27 C40 36 60 41 84 41 C108 41 128 36 134 27 Z" />
        {/* three dorsal fins — unmistakably cod */}
        <path d="M110 13 C109 6 101 4 95 7 C99 9 102 11 103 14 Z" />
        <path d="M88 12 C87 5 78 3 72 6 C76 8 79 10 80 13 Z" />
        <path d="M64 13 C63 7 55 5 49 8 C53 10 56 12 57 14 Z" />
        <path d="M92 40 C91 47 83 49 77 46 C81 44 84 42 85 39 Z" />
        <path d="M66 40 C65 46 58 48 52 45 C56 43 59 41 60 38 Z" />
        {/* chin barbel */}
        <path
          d="M126 33 C126 37 124 40 121 41"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="123" cy="21" r="2.4" fill="var(--detail)" />
      </>
    ),
  },

  sunfish: {
    viewBox: "0 0 100 112",
    w: 100,
    h: 112,
    head: [78, 48],
    // no true tail — the wavy clavus gets the (very subtle) wag
    tail: (
      <path d="M26 36 C18 41 14 48 14 56 C14 64 18 71 26 76 C23 69 22 62 22 56 C22 50 23 43 26 36 Z" />
    ),
    body: (
      <>
        <path d="M88 56 C86 38 72 26 54 26 C37 26 24 38 21 56 C24 74 37 86 54 86 C72 86 86 74 88 56 Z" />
        {/* the lopsided disc: towering dorsal + anal fins */}
        <path d="M58 28 C62 16 58 6 49 3 C46 13 45 21 47 29 Z" />
        <path d="M58 84 C62 96 58 106 49 109 C46 99 45 91 47 83 Z" />
        <path d="M60 52 C64 46 64 40 60 36 C57 41 56 47 58 52 Z" />
        <circle cx="76" cy="48" r="3" fill="var(--detail)" />
        <circle cx="87" cy="55" r="1.8" fill="var(--detail)" />
      </>
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

  basking: {
    viewBox: "0 0 200 76",
    w: 200,
    h: 76,
    head: [170, 28],
    tail: (
      <path d="M52 40 C44 30 36 21 26 15 C30 25 32 34 31 40 C32 46 30 55 26 62 C36 57 44 48 52 42 Z" />
    ),
    body: (
      <>
        {/* the gaping mouth is the notch at the snout */}
        <path d="M196 31 C188 25 172 21 152 20 C112 18 72 26 50 40 C72 52 114 58 154 56 C170 55 184 51 191 48 C182 44 177 40 177 36 C181 33 188 31 196 31 Z" />
        <path d="M122 20 C120 7 110 2 100 4 C106 10 110 16 111 21 Z" />
        <path d="M130 54 C126 63 118 68 108 67 C114 60 118 56 120 51 Z" />
        {/* enormous gill slits */}
        <path d="M148 24 C145 31 145 45 148 52" fill="none" stroke="var(--detail)" strokeWidth="1.6" />
        <path d="M156 23 C153 31 153 45 156 52" fill="none" stroke="var(--detail)" strokeWidth="1.6" />
        <path d="M164 23 C161 30 161 44 164 51" fill="none" stroke="var(--detail)" strokeWidth="1.6" />
        <path d="M172 24 C169 30 169 42 172 49" fill="none" stroke="var(--detail)" strokeWidth="1.6" />
        <circle cx="184" cy="26" r="1.8" fill="var(--detail)" />
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
};

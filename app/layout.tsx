import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const cond = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cond",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://guppies.jayanth.mov"),
  title: "guppies leaderboard",
  description:
    "An ocean of creators. Bigger fish live deeper — scroll down to descend.",
  openGraph: {
    title: "guppies leaderboard",
    description:
      "An ocean of creators. Bigger fish live deeper — scroll down to descend.",
    url: "https://guppies.jayanth.mov",
    siteName: "guppies",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "The Guppies creator leaderboard above a lively blue ocean",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "guppies leaderboard",
    description:
      "An ocean of creators. Bigger fish live deeper — scroll down to descend.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: "#08203C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cond.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

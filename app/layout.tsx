import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "RosterPulse — Fantasy Start/Sit Engine",
  description:
    "Local-first fantasy football start/sit recommendations powered by betting lines, expert consensus, and matchup analytics.",
};

export const viewport: Viewport = {
  themeColor: "#EFF2F7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="ambient-glow min-h-screen bg-canvas font-sans text-slate-800"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

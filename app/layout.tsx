import type { Metadata } from "next";
import "./globals.css";
import CommandPalette from "@/components/command-palette";
import MobileTabbar from "@/components/mobile-tabbar";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import StaleBanner from "@/components/stale-banner";
import TickerStrip from "@/components/ticker-strip";
import { getSiteUrl } from "@/lib/site-url";

// Journal design: one system serif family site-wide (Charter / Iowan Old
// Style / Georgia, declared in globals.css) — no webfonts to load.

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Buy-Side — Market Briefings",
    template: "%s — Buy-Side",
  },
  description:
    "Opinionated, cited, auditable market briefings. Tells you when NOT to buy as much as when to buy. Not investment advice.",
  openGraph: {
    type: "website",
    siteName: "Buy-Side Briefings",
    title: "Buy-Side — Market Briefings",
    description:
      "Opinionated, cited, auditable market briefings. Buy-side voice — tells you when NOT to buy as much as when to buy.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy-Side — Market Briefings",
    description:
      "Opinionated, cited, auditable market briefings. Buy-side voice — tells you when NOT to buy.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        <SiteHeader />
        <StaleBanner />
        <TickerStrip />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-1.5 py-1.5 pb-14 sm:px-2 sm:py-2 md:pb-2">{children}</main>
        <SiteFooter />
        <MobileTabbar />
        <CommandPalette />
      </body>
    </html>
  );
}

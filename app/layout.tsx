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
  // All three descriptions describe the same site in the same terms: a
  // briefing twice a day, cited, and explicitly not a recommendation. The
  // previous copy sold "tells you when NOT to buy as much as when to buy" —
  // a buy/sell call, which the site stopped making in July.
  description:
    "A market briefing twice a day, morning and night: what happened, what it means, and what would change it — with every claim linked to its source.",
  openGraph: {
    type: "website",
    siteName: "Buy-Side Briefings",
    title: "Buy-Side — Market Briefings",
    description:
      "A market briefing twice a day, morning and night. Every claim carries a number and every number links to its source. It reports; the decision stays yours.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy-Side — Market Briefings",
    description:
      "A market briefing twice a day, morning and night — every claim linked to its source.",
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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Stamps the saved theme before first paint. Without it the page
            renders at the OS preference and then snaps to the chosen one — a
            white flash for anyone who picked dark. Inline and synchronous on
            purpose: it has to run before the body paints. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("bsb:theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`,
          }}
        />
      </head>
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

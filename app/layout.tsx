import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import TickerStrip from "@/components/ticker-strip";
import { getSiteUrl } from "@/lib/site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BSB Terminal — Buy-Side Briefings",
    template: "%s — Buy-Side Briefings",
  },
  description:
    "Opinionated, cited, auditable market briefings. Tells you when NOT to buy as much as when to buy. Not investment advice.",
  openGraph: {
    type: "website",
    siteName: "Buy-Side Briefings",
    title: "BSB Terminal — Buy-Side Briefings",
    description:
      "Opinionated, cited, auditable market briefings. Buy-side voice — tells you when NOT to buy as much as when to buy.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "BSB Terminal — Buy-Side Briefings",
    description:
      "Opinionated, cited, auditable market briefings. Buy-side voice — tells you when NOT to buy.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const learnInitScript = `(function(){try{var v=localStorage.getItem('learnMode');document.documentElement.setAttribute('data-learn', v==='off'?'off':'on');}catch(e){document.documentElement.setAttribute('data-learn','on');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-learn="on"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: learnInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        <SiteHeader />
        <TickerStrip />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-2 py-3 sm:px-4 sm:py-4 lg:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

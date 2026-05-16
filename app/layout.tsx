import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import TickerStrip from "@/components/ticker-strip";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BSB Terminal — Buy-Side Briefings",
  description:
    "Opinionated, cited, auditable market briefings. Tells you when NOT to buy as much as when to buy. Not investment advice.",
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
      className={`${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: learnInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        <SiteHeader />
        <TickerStrip />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-2 py-2">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

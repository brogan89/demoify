import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";
import { FederationBanner } from "@/components/federation-banner";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { PlayerProvider } from "@/components/player/player-provider";
import { PlayerBar } from "@/components/player/player-bar";
import { ErrorMonitor } from "@/components/error-monitor";
import { DevDbPullButton } from "@/components/dev/dev-db-pull-button";
import { DevViewportToggle } from "@/components/dev/dev-viewport-toggle";

// Only under plain `npm run dev` — never in production or `dev:remote` (which
// reads the remote DB, so there's nothing local to populate).
const showDevDbPull =
  process.env.NODE_ENV !== "production" && process.env.DEV_REMOTE_DB !== "1";
// The viewport preview is purely visual, so it's useful in dev and dev:remote.
const showDevTools = process.env.NODE_ENV !== "production";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for headings only (wired to `font-heading` in globals.css).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

// Tint the mobile browser chrome to match the theme backgrounds.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#131119" },
    { media: "(prefers-color-scheme: light)", color: "#fbfafc" },
  ],
};

export const metadata: Metadata = {
  title: "Demoify — Share music, get feedback",
  description:
    "The simple way for artists and producers to share tracks with one link and collect feedback in the comments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ErrorMonitor />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <PlayerProvider>
            <SiteHeader />
            <FederationBanner />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <PlayerBar />
            {showDevDbPull && <DevDbPullButton />}
            {showDevTools && <DevViewportToggle />}
          </PlayerProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

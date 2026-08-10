import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";
import { FederationBanner } from "@/components/federation-banner";
import { VerifyEmailBanner } from "@/components/verify-email-banner";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { PlayerProvider } from "@/components/player/player-provider";
import { PlayerBar } from "@/components/player/player-bar";
import { ErrorMonitor } from "@/components/error-monitor";
import { DevDbPullButton } from "@/components/dev/dev-db-pull-button";
import { DevViewportToggle } from "@/components/dev/dev-viewport-toggle";
import { siteUrl } from "@/lib/site";
import { AttributionCapture } from "@/components/attribution-capture";

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

const DESCRIPTION =
  "The permanent link for a song in progress. Push new versions without breaking the link, and collect feedback anchored to the exact version.";

export const metadata: Metadata = {
  // Without metadataBase, every relative OG/Twitter image URL — including the
  // ones the opengraph-image.tsx file convention generates — resolves against
  // localhost and social cards render blank. The whole product is "one link you
  // can share", so this is load-bearing, not polish.
  metadataBase: siteUrl(),
  title: {
    default: "Demoify — Share music, get feedback",
    template: "%s · Demoify",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Demoify",
    title: "Demoify — Share music, get feedback",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Demoify — Share music, get feedback",
    description: DESCRIPTION,
  },
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
        {/* MUST stay the first element in <body>. Components that inject
            inline scripts by stringifying a function (next-themes' theme
            init, ErrorMonitor) serialize the BUNDLED copy of that function,
            which esbuild's keepNames instrumentation has salted with
            __name(...) calls — a helper that only exists inside the worker
            bundle. Without this shim the browser throws "__name is not
            defined" and the pre-hydration theme setter dies (flash of wrong
            theme). Defining a compatible no-op first lets those scripts run;
            harmless if the bundler ever stops injecting it. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'self.__name=self.__name||function(t,n){try{Object.defineProperty(t,"name",{value:n,configurable:true})}catch(e){}return t};',
          }}
        />
        <ErrorMonitor />
        <AttributionCapture />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <PlayerProvider>
            <SiteHeader />
            <VerifyEmailBanner />
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

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { PlayerProvider } from "@/components/player/player-provider";
import { PlayerBar } from "@/components/player/player-bar";
import { DevDbPullButton } from "@/components/dev/dev-db-pull-button";

// Only under plain `npm run dev` — never in production or `dev:remote` (which
// reads the remote DB, so there's nothing local to populate).
const showDevDbPull =
  process.env.NODE_ENV !== "production" && process.env.DEV_REMOTE_DB !== "1";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PlayerProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <PlayerBar />
            {showDevDbPull && <DevDbPullButton />}
          </PlayerProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

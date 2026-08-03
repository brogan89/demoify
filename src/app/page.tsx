import Link from "next/link";
import {
  ArrowRight,
  HandCoins,
  Heart,
  History,
  Link2,
  MessageSquare,
  Server,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { GENRES } from "@/lib/genres";
import { WAVEFORM_BARS, parsePeaksJson } from "@/lib/waveform";
import { Button } from "@/components/ui/button";
import { WaveformBars } from "@/components/waveform";
import { SongFeed } from "@/components/song-feed";
import { type SongCardData } from "@/components/song-card";
import { ArtTile, Equalizer } from "@/components/art-tile";
import { Reveal } from "@/components/reveal";

// The product's three pillars, presented as the loop they actually form:
// share a link → collect feedback → upload the next version, same link.
const PILLARS = [
  {
    n: "01",
    icon: Link2,
    title: "One link to share",
    body: "Send a single link to anyone. They press play — no app, no account needed.",
  },
  {
    n: "02",
    icon: MessageSquare,
    title: "Feedback in the comments",
    body: "Listeners and collaborators leave notes right under the track.",
  },
  {
    n: "03",
    icon: History,
    title: "Every version kept",
    body: "Upload a new take and the same link serves it — old versions stay safe.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  // Empty id matches no rows, so logged-out visitors get liked=false everywhere.
  const viewerId = user?.id ?? "";

  // A taste of the real product: the latest public tracks, playable in place.
  // Local dev runs against an empty D1, so the section hides itself when there
  // is nothing to show.
  const songs = await prisma.songProject.findMany({
    where: { visibility: "PUBLIC", versions: { some: {} } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      band: { select: { username: true, displayName: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: viewerId }, select: { id: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          id: true,
          audioUrl: true,
          duration: true,
          peaks: true,
          versionNumber: true,
          uploadedAt: true,
        },
      },
    },
  });

  const entries: SongCardData[] = songs.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    playCount: s.playCount,
    likeCount: s._count.likes,
    commentCount: s._count.comments,
    liked: s.likes.length > 0,
    isPrivate: false,
    band: s.band,
    version: {
      ...s.versions[0],
      peaks: parsePeaksJson(s.versions[0].peaks),
      uploadedAt: s.versions[0].uploadedAt.toISOString(),
    },
  }));

  return (
    <div className="relative isolate overflow-x-clip">
      {/* Ambient studio-glow washes. Radial gradients, not blur filters —
          visually the same soft glow but far cheaper to scroll past. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[32rem] w-[48rem] -translate-x-2/3 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--brand-from)_20%,transparent),transparent)] animate-pulse-glow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-64 right-0 -z-10 h-[28rem] w-[36rem] translate-x-1/3 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--brand-to)_15%,transparent),transparent)] animate-pulse-glow [animation-delay:2s]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-24 left-0 -z-10 h-[24rem] w-[32rem] -translate-x-1/3 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--brand-from)_10%,transparent),transparent)]"
      />

      {/* Hero */}
      <section className="mx-auto grid max-w-5xl items-center gap-12 px-4 pt-16 pb-16 md:grid-cols-2 md:pt-24 md:pb-24">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2.5 rounded-full border bg-card/60 px-3.5 py-1.5 font-mono text-xs tracking-widest text-muted-foreground uppercase animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Equalizer className="h-3 text-primary" />
            Share music. Get feedback.
          </span>
          <h1 className="font-heading text-5xl font-bold tracking-tight text-balance sm:text-6xl animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100 fill-mode-backwards">
            Share your music <span className="text-brand-gradient">with one link.</span>
          </h1>
          <p className="max-w-prose text-lg text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200 fill-mode-backwards">
            Demoify is the simple way for artists to share tracks, publicly or
            privately, and update the track with a new version but keep the same
            link.
          </p>
          <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300 fill-mode-backwards">
            {user ? (
              <Button
                asChild
                size="lg"
                className="bg-brand-gradient text-white shadow-glow-sm hover:opacity-90"
              >
                <Link href="/library">Open your library</Link>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="bg-brand-gradient text-white shadow-glow-sm hover:opacity-90"
              >
                <Link href="/signup">Get started</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <Link href="/explore">Explore tracks</Link>
            </Button>
          </div>
        </div>

        {/* The product, miniature: a song card whose waveform plays itself. */}
        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-backwards">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 shadow-glow">
            <div className="mb-4 flex items-center gap-3">
              <ArtTile seed="midnight-demo" size="sm">
                <Equalizer className="h-3.5 text-white drop-shadow" />
              </ArtTile>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Midnight demo</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  demoify.app/your-band/midnight-demo
                </p>
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                v3
              </span>
            </div>
            <div className="rounded-lg border bg-background/60 p-3">
              <div className="relative">
                <WaveformBars />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 animate-hero-progress"
                >
                  <WaveformBars playedBars={WAVEFORM_BARS} />
                </div>
              </div>
              <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
                <span>1:12</span>
                <span>3:24</span>
              </div>
            </div>
          </div>
          <div className="relative mx-4 -mt-3 flex -rotate-1 items-start gap-2 rounded-lg border bg-popover p-3 shadow-glow-sm">
            <MessageSquare className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              &ldquo;Love the new mix — vocals sit so much better now.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Every genre passes through here — the taxonomy is real (src/lib/genres.ts). */}
      <div
        aria-hidden
        className="border-y border-border/60 py-3 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] overflow-hidden"
      >
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex items-center gap-6 pr-6 font-mono text-xs tracking-widest whitespace-nowrap text-muted-foreground uppercase"
            >
              {GENRES.map((g) => (
                <span key={g.name} className="flex items-center gap-6">
                  {g.name}
                  <span className="text-primary/60">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Live tracks — the landing page is a working demo of the product. */}
      {entries.length > 0 && (
        <section id="fresh-demos" className="mx-auto max-w-5xl px-4 pt-16 md:pt-20">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs tracking-widest text-primary uppercase">
                    Live on Demoify
                  </p>
                  <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight md:text-4xl">
                    Fresh demos, straight from the studio
                  </h2>
                </div>
                <Button asChild variant="ghost" className="text-muted-foreground">
                  <Link href="/explore">
                    Explore all <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <SongFeed entries={entries} isAuthed={Boolean(user)} />
            </Reveal>
          </div>
        </section>
      )}

      {/* How it works — the three pillars are the loop itself. */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-4 pt-20 md:pt-24">
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-primary uppercase">
            The loop
          </p>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight md:text-4xl">
            How it works
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {PILLARS.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className="group h-full rounded-xl bg-card p-6 ring-1 ring-foreground/10 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-glow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <span className="font-mono text-sm text-muted-foreground">
                    {f.n}
                  </span>
                </div>
                <h3 className="mt-4 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                {f.n === "03" && (
                  <div
                    aria-hidden
                    className="mt-4 flex items-center gap-2 font-mono text-[10px] text-muted-foreground"
                  >
                    <span>v1</span>
                    <span className="h-px flex-1 bg-border" />
                    <span>v2</span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="rounded-full bg-brand-gradient px-2 py-0.5 font-medium text-white shadow-glow-sm">
                      v3
                    </span>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section id="who-its-for" className="mx-auto max-w-5xl px-4 pt-16 md:pt-20">
        <div className="grid gap-6 sm:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-xl border p-6">
              <h3 className="font-heading text-xl font-semibold">For Artists</h3>
              <p className="mt-2 text-muted-foreground">
                Bands can share demos and get feedback from other band members.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="h-full rounded-xl border p-6">
              <h3 className="font-heading text-xl font-semibold">For Producers</h3>
              <p className="mt-2 text-muted-foreground">
                Producers can drop mixes and masters and collect feedback right
                in the comments.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Support + self-hosting */}
      <section id="support" className="mx-auto max-w-5xl px-4 pt-16 md:pt-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal className="h-full">
            {/* The page's one gradient-border card — the 💜 is literally on-brand now. */}
            <div className="h-full rounded-xl bg-brand-gradient p-px shadow-glow-sm">
              <div className="flex h-full flex-col items-center rounded-[calc(var(--radius)*1.4-1px)] bg-card p-8 text-center">
                <HandCoins className="mb-3 size-6 text-primary" />
                <h2 className="font-heading text-xl font-semibold">
                  Support your favorite artists
                </h2>
                <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
                  Love a track? Send the artist a tip.{" "}
                  <strong className="text-foreground">
                    90% goes straight to the artist
                  </strong>{" "}
                  and 10% keeps Demoify running — so a thank-you to them is a
                  thank-you to us too. 💜
                </p>
                <div className="mt-5 flex flex-1 items-end">
                  <Button
                    asChild
                    size="lg"
                    className="bg-brand-gradient text-white hover:opacity-90"
                  >
                    <Link href="/explore">Find an artist to support</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100} className="h-full">
            <div className="flex h-full flex-col items-center rounded-xl border bg-card/50 p-8 text-center">
              <Server className="mb-3 size-6 text-primary" />
              <h2 className="font-heading text-xl font-semibold">
                Run your own Demoify
              </h2>
              <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
                Demoify is open source — you can host it yourself. Bring your
                own storage and switch off upload credits entirely, so uploads
                are <strong className="text-foreground">free and unlimited</strong>.
                You can even federate your public tracks into this shared
                Explore feed.
              </p>
              <p className="mt-3 rounded-md border bg-background/60 px-2.5 py-1 font-mono text-xs text-muted-foreground">
                git clone github.com/brogan89/demoify
              </p>
              <div className="mt-5 flex flex-1 items-end">
                <Button asChild size="lg" variant="outline">
                  <a
                    href="https://github.com/brogan89/demoify#self-hosting"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Self-hosting guide
                  </a>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final call */}
      <section id="get-started" className="relative mx-auto max-w-5xl px-4 py-24 text-center md:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 top-1/2 -z-10 -translate-y-1/2 opacity-10"
        >
          <WaveformBars />
        </div>
        <Reveal>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Ready when your <span className="text-brand-gradient">mix</span> is.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Upload your first demo and send the link tonight.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-brand-gradient text-white shadow-glow-sm hover:opacity-90"
          >
            <Link href={user ? "/dashboard" : "/signup"}>Get started</Link>
          </Button>
        </Reveal>
      </section>

      {/* The honest sign-off */}
      <section className="mx-auto max-w-2xl px-4 pb-20">
        <Reveal>
          <div className="rounded-xl border p-6 text-center">
            <Heart className="mx-auto mb-3 size-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Demoify is a passion project built by a solo developer, and
              it&rsquo;s still in early development — so expect rough edges as
              it grows.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Have feedback or found a bug?{" "}
              <a
                href="https://github.com/brogan89/demoify/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Open an issue on GitHub
              </a>{" "}
              — I&rsquo;d love to hear it.
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

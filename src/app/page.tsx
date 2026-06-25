import Link from "next/link";
import { Disc3, HandCoins, Heart, History, Link2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaveformBars } from "@/components/waveform";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <Disc3 className="size-3.5" /> Share music. Get feedback.
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Share your music with one link.
          </h1>
          <div className="max-w-prose space-y-4 text-lg text-muted-foreground">
            <p>
              Demoify is the simple way for artists to share tracks, publicly or privately, and update the track with a new version but keep the same link.
            </p>
            <div>
              <h2 className="font-bold text-foreground">For Artists</h2>
              <p>Bands can share demos and get feedback from other band members.</p>
            </div>
            <div>
              <h2 className="font-bold text-foreground">For Producers</h2>
              <p>Producers can drop mixes and masters and collect feedback right in the comments.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Disc3 className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Song Title</p>
              <p className="font-mono text-xs text-muted-foreground">
                demoify.app/band-name/song-title
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <WaveformBars playedBars={58} />
            <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
              <span>1:12</span>
              <span>3:24</span>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg border p-3">
            <MessageSquare className="mt-0.5 size-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              &ldquo;Love the new mix — vocals sit so much better now.&rdquo;
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 pb-20 sm:grid-cols-3">
        {[
          {
            icon: Link2,
            title: "One link to share",
            body: "Send a single link to anyone. They press play — no app, no account needed.",
          },
          {
            icon: MessageSquare,
            title: "Feedback in the comments",
            body: "Listeners and collaborators leave notes right under the track.",
          },
          {
            icon: History,
            title: "Every version kept",
            body: "Upload a new take and the same link serves it — old versions stay safe.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border p-5">
            <f.icon className="mb-3 size-5 text-primary" />
            <h3 className="font-medium">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-2xl pb-20 text-center">
        <div className="rounded-lg border bg-card p-8">
          <HandCoins className="mx-auto mb-3 size-6 text-primary" />
          <h2 className="text-xl font-semibold">Support your favorite artists</h2>
          <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
            Love a track? Send the artist a tip. <strong className="text-foreground">90% goes
            straight to the artist</strong> and 10% keeps Demoify running — so a thank-you to
            them is a thank-you to us too. 💜
          </p>
          <Button asChild size="lg" className="mt-5">
            <Link href="/explore">Find an artist to support</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-2xl pb-20 text-center">
        <div className="rounded-lg border p-6">
          <Heart className="mx-auto mb-3 size-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Demoify is a passion project built by a solo developer, and it&rsquo;s still in
            early development — so expect rough edges as it grows.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Have feedback or found a bug? Open an issue on GitHub — I&rsquo;d love
            to hear it.
          </p>
        </div>
      </section>
    </div>
  );
}

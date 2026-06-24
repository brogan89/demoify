import Link from "next/link";
import { Disc3, GitBranch, History, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SAMPLE = [
  { v: 4, note: "Mastered version" },
  { v: 3, note: "New vocal take" },
  { v: 2, note: "Added drums" },
  { v: 1, note: "Initial demo" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <GitBranch className="size-3.5" /> Version control for music
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            GitHub for songs.
          </h1>
          <p className="max-w-prose text-lg text-muted-foreground">
            Share works-in-progress, not finished tracks. One permanent link that always plays
            the latest version — with every revision preserved.
          </p>
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
          <ol className="space-y-0 border-l pl-4">
            {SAMPLE.map((s, i) => (
              <li key={s.v} className="relative pb-4 last:pb-0">
                <span
                  className={`absolute -left-[1.15rem] top-1.5 size-2 rounded-full ring-4 ring-card ${
                    i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                  }`}
                />
                <p className="text-sm font-medium">
                  v{s.v}
                  {i === 0 && <span className="ml-1 text-xs text-primary">latest</span>}
                </p>
                <p className="text-xs text-muted-foreground">{s.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="grid gap-6 pb-20 sm:grid-cols-3">
        {[
          {
            icon: History,
            title: "Full version history",
            body: "Every upload becomes a new version. Nothing is ever lost.",
          },
          {
            icon: Share2,
            title: "One permanent link",
            body: "Share once. The same URL always serves your newest take.",
          },
          {
            icon: GitBranch,
            title: "Built to evolve",
            body: "Songs are works-in-progress, not finished products.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border p-5">
            <f.icon className="mb-3 size-5 text-primary" />
            <h3 className="font-medium">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

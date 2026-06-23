import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Disc3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { SongView, type VersionDTO } from "@/components/song-view";

async function getProject(username: string, slug: string) {
  return prisma.songProject.findFirst({
    where: { slug, owner: { username } },
    include: {
      owner: { select: { username: true, displayName: true } },
      versions: { orderBy: { versionNumber: "desc" } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const project = await getProject(username, slug);
  if (!project) return { title: "Not found — Demoify" };
  const title = `${project.title} — ${project.owner.displayName}`;
  return {
    title: `${title} · Demoify`,
    description: project.description ?? `Listen to ${project.title} on Demoify.`,
    openGraph: { title, description: project.description ?? undefined },
  };
}

export default async function PublicSongPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const project = await getProject(username, slug);
  if (!project) notFound();

  const versions: VersionDTO[] = project.versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    audioUrl: v.audioUrl,
    changelog: v.changelog,
    duration: v.duration,
    uploadedAt: v.uploadedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-start gap-3">
        <Disc3 className="mt-1 size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="text-sm text-muted-foreground">by {project.owner.displayName}</p>
          {project.description && (
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <SongView versions={versions} />
    </div>
  );
}

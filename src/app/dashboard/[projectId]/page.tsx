import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isR2Configured } from "@/lib/r2";
import { SongView, type VersionDTO } from "@/components/song-view";
import { UploadVersion } from "@/components/upload-version";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [project, account] = await Promise.all([
    prisma.songProject.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { username: true, displayName: true } },
        versions: { orderBy: { versionNumber: "desc" } },
      },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } }),
  ]);
  if (!project || project.ownerId !== user.id) notFound();

  const versions: VersionDTO[] = project.versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    audioUrl: v.audioUrl,
    changelog: v.changelog,
    duration: v.duration,
    uploadedAt: v.uploadedAt.toISOString(),
  }));

  const publicPath = `/${project.owner.username}/${project.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <Link
            href={publicPath}
            className="flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
          >
            View public page <ExternalLink className="size-3.5" />
          </Link>
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          demoify.com{publicPath}
        </p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium">Upload new version</h2>
        <UploadVersion
          projectId={project.id}
          uploadsEnabled={isR2Configured()}
          credits={account?.credits ?? 0}
        />
      </div>

      <SongView versions={versions} />
    </div>
  );
}

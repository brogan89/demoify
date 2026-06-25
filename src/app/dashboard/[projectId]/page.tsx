import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getMembership, canManageSongs, isMember } from "@/lib/band";
import { isR2Configured } from "@/lib/r2";
import { SongView, type VersionDTO } from "@/components/song-view";
import { type CommentDTO } from "@/components/comments";
import { UploadVersion } from "@/components/upload-version";
import { DeleteSongButton } from "@/components/delete-song-button";
import { VisibilityToggle } from "@/components/visibility-toggle";
import { GenreEditor } from "@/components/genre-editor";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await prisma.songProject.findUnique({
    where: { id: projectId },
    include: {
      band: { select: { id: true, username: true, displayName: true, credits: true } },
      versions: { orderBy: { versionNumber: "desc" } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, displayName: true, avatarUrl: true } },
          version: { select: { versionNumber: true } },
        },
      },
    },
  });
  if (!project) notFound();

  // Anyone in the band can open the editor; only ADMIN/MANAGER can change things.
  const role = await getMembership(project.bandId, user.id);
  if (!isMember(role)) notFound();
  const canManage = canManageSongs(role);

  const versions: VersionDTO[] = project.versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    audioUrl: v.audioUrl,
    changelog: v.changelog,
    duration: v.duration,
    uploadedAt: v.uploadedAt.toISOString(),
  }));

  const comments: CommentDTO[] = project.comments.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    versionId: c.versionId,
    versionNumber: c.version.versionNumber,
    timestampSeconds: c.timestampSeconds,
    authorId: c.authorId,
    authorName: c.author.displayName,
    authorAvatarUrl: c.author.avatarUrl,
  }));

  const publicPath = `/${project.band.username}/${project.slug}`;
  const visibility = project.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <div className="flex items-center gap-3">
            <Link
              href={publicPath}
              className="flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            >
              View public page <ExternalLink className="size-3.5" />
            </Link>
            {canManage && (
              <VisibilityToggle projectId={project.id} visibility={visibility} />
            )}
            {canManage && <DeleteSongButton projectId={project.id} />}
          </div>
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          demoify.app{publicPath}
        </p>
        {canManage ? (
          <div className="mt-4">
            <GenreEditor
              projectId={project.id}
              genre={project.genre}
              subgenre={project.subgenre}
            />
          </div>
        ) : (
          project.genre && (
            <p className="mt-2 text-sm text-muted-foreground">
              {project.genre}
              {project.subgenre ? ` · ${project.subgenre}` : ""}
            </p>
          )
        )}
      </div>

      {canManage && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium">Upload new version</h2>
          <UploadVersion
            projectId={project.id}
            uploadsEnabled={isR2Configured()}
            credits={project.band.credits}
          />
        </div>
      )}

      <SongView
        versions={versions}
        projectId={project.id}
        playCount={project.playCount}
        comments={comments}
        currentUserId={user.id}
        canComment
        canModerate={canManage}
      />
    </div>
  );
}

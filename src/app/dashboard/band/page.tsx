import Link from "next/link";
import { redirect } from "next/navigation";
import { Banknote, ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getActiveBand, canManageMembers, canManageSongs, type Role } from "@/lib/band";
import { ManageBandMembers, type MemberRow } from "@/components/manage-band-members";
import { EditArtistProfile } from "@/components/edit-artist-profile";

export default async function BandPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const active = await getActiveBand();
  if (!active) redirect("/dashboard");

  const profile = await prisma.band.findUnique({
    where: { id: active.band.id },
    select: { bio: true, avatarUrl: true },
  });

  const memberships = await prisma.bandMembership.findMany({
    where: { bandId: active.band.id },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
    },
  });

  const members: MemberRow[] = memberships.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    name: m.user.displayName,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
    role: m.role as Role,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Users className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">{active.band.displayName}</h1>
          <Link
            href={`/${active.band.username}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            demoify.app/{active.band.username}
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      {canManageSongs(active.role) && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium">Artist profile</h2>
          <EditArtistProfile
            bandId={active.band.id}
            initialDisplayName={active.band.displayName}
            initialBio={profile?.bio ?? ""}
            initialAvatarUrl={profile?.avatarUrl ?? null}
          />
        </section>
      )}

      {canManageMembers(active.role) && (
        <section className="mb-8">
          <h2 className="mb-1 text-sm font-medium">Tips &amp; payouts</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Set up payouts to let listeners tip this artist.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/payouts">
              <Banknote className="size-3.5" /> Manage tips &amp; payouts
            </Link>
          </Button>
        </section>
      )}

      <h2 className="mb-3 text-sm font-medium">Members</h2>
      <ManageBandMembers
        bandId={active.band.id}
        members={members}
        canManage={canManageMembers(active.role)}
        currentUserId={user.id}
      />
    </div>
  );
}

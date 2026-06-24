import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getActiveBand, canManageMembers, type Role } from "@/lib/band";
import { ManageBandMembers, type MemberRow } from "@/components/manage-band-members";

export default async function BandPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const active = await getActiveBand();
  if (!active) redirect("/dashboard");

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
          <p className="text-sm text-muted-foreground">
            Band members · demoify.app/{active.band.username}
          </p>
        </div>
      </div>

      <ManageBandMembers
        bandId={active.band.id}
        members={members}
        canManage={canManageMembers(active.role)}
        currentUserId={user.id}
      />
    </div>
  );
}

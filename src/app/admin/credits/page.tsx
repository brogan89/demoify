import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { GiftCredits } from "@/components/gift-credits";

export default async function AdminCreditsPage() {
  if (!(await isCurrentUserAdmin())) redirect("/dashboard");

  const gifts = await prisma.creditTransaction.findMany({
    where: { reason: "gift" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { band: { select: { username: true, displayName: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Admin
      </Link>
      <h1 className="mb-1 text-2xl font-semibold">Gift credits</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Directly credit a band&rsquo;s balance — for bug bounties, good feedback, refunds,
        or topping up your own account.
      </p>
      <GiftCredits
        gifts={gifts.map((g) => ({
          id: g.id,
          amount: g.delta,
          note: g.note,
          createdAt: g.createdAt,
          band: g.band,
        }))}
      />
    </div>
  );
}

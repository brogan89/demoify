import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { ManageCoupons } from "@/components/manage-coupons";

export default async function AdminCouponsPage() {
  if (!(await isCurrentUserAdmin())) redirect("/dashboard");

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Admin
      </Link>
      <h1 className="mb-1 text-2xl font-semibold">Coupons</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Issue free-credit or discount codes.
      </p>
      <ManageCoupons
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          kind: c.kind as "FREE_CREDITS" | "PERCENT_OFF" | "FIXED_OFF",
          amount: c.amount,
          maxRedemptions: c.maxRedemptions,
          redemptionCount: c.redemptionCount,
          active: c.active,
          expiresAt: c.expiresAt,
        }))}
      />
    </div>
  );
}

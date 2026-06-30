import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, Ticket, BarChart3 } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";

export default async function AdminPage() {
  if (!(await isCurrentUserAdmin())) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Admin</h1>
      <ul className="space-y-2">
        <li>
          <Link
            href="/admin/analytics"
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
          >
            <BarChart3 className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Analytics</p>
              <p className="text-xs text-muted-foreground">Usage, revenue, and engagement dashboard</p>
            </div>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/coupons"
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
          >
            <Ticket className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Coupons</p>
              <p className="text-xs text-muted-foreground">Free-credit and discount codes</p>
            </div>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/credits"
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
          >
            <Gift className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Gift credits</p>
              <p className="text-xs text-muted-foreground">Directly credit a specific band</p>
            </div>
          </Link>
        </li>
      </ul>
    </div>
  );
}

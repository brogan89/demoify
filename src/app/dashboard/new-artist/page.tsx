import Link from "next/link";
import { redirect } from "next/navigation";
import { Disc3 } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { requireEmailVerification } from "@/lib/verification";
import { getMyBands } from "@/lib/band";
import { CreateArtistForm } from "@/components/create-artist-form";

export default async function NewArtistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // This is where a brand-new account lands (dashboard redirects here when they
  // have no band), so it's the first place an unverified user would hit a wall.
  // Say so up front instead of letting them name an artist and get a toast.
  const blocked = requireEmailVerification() && !user.emailVerified;

  // First-run onboarding (no artists yet) reads differently from adding another.
  const isFirst = (await getMyBands()).length === 0;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <Disc3 className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">
            {isFirst ? "Create your first artist profile" : "New artist profile"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isFirst
              ? "Want to share your own songs? This is your public page where they live, with 10 free uploads to start. It's optional — you can always create one later."
              : "Free to create — starts with one free upload."}
          </p>
        </div>
      </div>
      {blocked ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm">
            Confirm your email address first — we sent a link to{" "}
            <strong className="font-medium">{user.email}</strong>. Once you click it you can
            create your artist profile and start uploading.
          </p>
          <Link
            href={`/verify-email?email=${encodeURIComponent(user.email)}`}
            className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Resend verification email →
          </Link>
        </div>
      ) : (
        <CreateArtistForm />
      )}
      {isFirst && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Just here to listen?{" "}
          <Link
            href="/explore"
            className="text-primary underline-offset-4 hover:underline"
          >
            Skip for now →
          </Link>
        </p>
      )}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Disc3 } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getMyBands } from "@/lib/band";
import { CreateArtistForm } from "@/components/create-artist-form";

export default async function NewArtistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
      <CreateArtistForm />
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

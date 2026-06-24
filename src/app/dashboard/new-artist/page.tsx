import { redirect } from "next/navigation";
import { Disc3 } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { CreateArtistForm } from "@/components/create-artist-form";

export default async function NewArtistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <Disc3 className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">New artist profile</h1>
          <p className="text-sm text-muted-foreground">
            Free to create — starts with one free upload.
          </p>
        </div>
      </div>
      <CreateArtistForm />
    </div>
  );
}

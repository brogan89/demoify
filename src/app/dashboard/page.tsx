import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Music4 } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getActiveBand, canManageSongs } from "@/lib/band";
import { listBandProjects } from "@/app/actions/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSongForm } from "@/components/create-song-form";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // A signed-in user with no artist profile yet is sent to create their first one.
  const active = await getActiveBand();
  if (!active) redirect("/dashboard/new-artist");

  const canManage = canManageSongs(active.role);
  const projects = await listBandProjects();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">{active.band.displayName}</h1>
            <p className="text-sm text-muted-foreground">
              Songs · you are {active.role.toLowerCase()}
            </p>
          </div>
          {projects.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {canManage ? "No songs yet. Create your first one →" : "No songs yet."}
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {projects.map((p) => {
                const latest = p.versions[0];
                return (
                  <li key={p.id}>
                    <Link href={`/dashboard/${p.id}`}>
                      <Card className="h-full transition-colors hover:border-primary">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Music4 className="size-4 text-primary" />
                            {p.title}
                            {p.visibility === "PRIVATE" && (
                              <Lock
                                className="size-3.5 text-muted-foreground"
                                aria-label="Private"
                              />
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          {p._count.versions === 0
                            ? "No versions yet"
                            : `${p._count.versions} version${p._count.versions > 1 ? "s" : ""} · latest v${latest.versionNumber}`}
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {canManage && (
          <aside>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create a song</CardTitle>
              </CardHeader>
              <CardContent>
                <CreateSongForm />
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}

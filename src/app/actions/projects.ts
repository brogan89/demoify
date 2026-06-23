"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { slugify, uniqueSlug } from "@/lib/slug";

export async function createProject(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return;

  const existing = await prisma.songProject.findMany({
    where: { ownerId: user.id },
    select: { slug: true },
  });
  const slug = uniqueSlug(slugify(title), new Set(existing.map((p) => p.slug)));

  const project = await prisma.songProject.create({
    data: { ownerId: user.id, title, description, slug },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/${project.id}`);
}

export async function listMyProjects() {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.songProject.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      _count: { select: { versions: true } },
    },
  });
}

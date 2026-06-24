"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setSongVisibility } from "@/app/actions/projects";

export function VisibilityToggle({
  projectId,
  visibility,
}: {
  projectId: string;
  visibility: "PUBLIC" | "PRIVATE";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isPublic = visibility === "PUBLIC";

  function toggle() {
    const next = isPublic ? "PRIVATE" : "PUBLIC";
    startTransition(async () => {
      const res = await setSongVisibility(projectId, next);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(next === "PRIVATE" ? "Song is now private" : "Song is now public");
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={pending}
      onClick={toggle}
      title={
        isPublic
          ? "Public — anyone with the link can listen"
          : "Private — only band members can listen"
      }
    >
      {isPublic ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
      {isPublic ? "Public" : "Private"}
    </Button>
  );
}

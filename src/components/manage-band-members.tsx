"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMember, removeMember, updateMemberRole } from "@/app/actions/bands";

type Role = "ADMIN" | "MANAGER" | "MEMBER";

export type MemberRow = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
};

const ROLES: Role[] = ["ADMIN", "MANAGER", "MEMBER"];

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function ManageBandMembers({
  bandId,
  members,
  canManage,
  currentUserId,
}: {
  bandId: string;
  members: MemberRow[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string }>, onOk?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      onOk?.();
      router.refresh();
    });
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    run(
      () => addMember(bandId, value, role),
      () => {
        toast.success("Member added");
        setEmail("");
        setRole("MEMBER");
      },
    );
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <form onSubmit={onAdd} className="space-y-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium">Add a member</h2>
          <div className="space-y-1.5">
            <Label htmlFor="member-email">Email of an existing Demoify user</Label>
            <Input
              id="member-email"
              type="email"
              required
              placeholder="bandmate@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="member-role">Role</Label>
              <RoleSelect
                id="member-role"
                value={role}
                disabled={pending}
                onChange={(r) => setRole(r)}
              />
            </div>
            <Button type="submit" disabled={pending} className="gap-1.5">
              <UserPlus className="size-4" />
              Add
            </Button>
          </div>
        </form>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium">
          Members{members.length > 0 && ` (${members.length})`}
        </h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.membershipId}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Avatar size="sm">
                {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
                <AvatarFallback>{initials(m.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.name}
                  {m.userId === currentUserId && (
                    <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>

              {canManage ? (
                <>
                  <RoleSelect
                    value={m.role}
                    disabled={pending}
                    onChange={(r) =>
                      run(() => updateMemberRole(m.membershipId, r))
                    }
                  />
                  {confirmId === m.membershipId ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => removeMember(m.membershipId),
                            () => setConfirmId(null),
                          )
                        }
                      >
                        Remove
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(m.membershipId)}
                      aria-label="Remove member"
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {m.role.toLowerCase()}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RoleSelect({
  id,
  value,
  disabled,
  onChange,
}: {
  id?: string;
  value: Role;
  disabled?: boolean;
  onChange: (role: Role) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Role)}
      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r.charAt(0) + r.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  );
}

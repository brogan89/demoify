import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AccountProfileForm } from "@/components/account-profile-form";
import { AccountEmailForm } from "@/components/account-email-form";
import { AccountPasswordForm } from "@/components/account-password-form";
import { DeleteAccountSection } from "@/components/delete-account-section";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">Profile</h2>
        <AccountProfileForm
          initialDisplayName={user.displayName ?? user.name}
          initialAvatarUrl={user.avatarUrl ?? null}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">Email</h2>
        <AccountEmailForm initialEmail={user.email} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">Password</h2>
        <AccountPasswordForm />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-destructive">Danger zone</h2>
        <DeleteAccountSection />
      </section>
    </div>
  );
}

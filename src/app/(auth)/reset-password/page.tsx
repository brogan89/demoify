import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResendVerificationForm } from "@/components/resend-verification-form";

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We sent a verification link to your inbox. Click it to activate your account, then log
            in. Didn&apos;t get it? Resend below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <ResendVerificationForm />
          </Suspense>
        </CardContent>
        <CardFooter className="mt-2">
          <p className="w-full text-center text-sm text-muted-foreground">
            Already verified?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

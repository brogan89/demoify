import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>We&apos;ll email you a link to reset it.</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
        <CardFooter className="mt-2">
          <p className="w-full text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

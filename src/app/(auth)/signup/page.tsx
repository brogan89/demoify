import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "@/components/signup-form";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import { enabledSocialProviders } from "@/lib/social";

export default function SignupPage() {
  const providers = enabledSocialProviders();

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start sharing your works-in-progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <SocialAuthButtons providers={providers} />
          <SignupForm />
        </CardContent>
        <CardFooter className="mt-2">
          <p className="w-full text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

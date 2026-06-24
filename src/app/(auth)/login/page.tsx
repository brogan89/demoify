import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import { enabledSocialProviders } from "@/lib/social";

export default function LoginPage() {
  const providers = enabledSocialProviders();

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Welcome back to Demoify.</CardDescription>
        </CardHeader>
        <CardContent>
          <SocialAuthButtons providers={providers} />
          <LoginForm />
        </CardContent>
        <CardFooter className="mt-2 flex-col gap-2">
          <p className="w-full text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

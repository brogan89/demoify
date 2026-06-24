import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { sendEmail, actionEmail, isEmailConfigured } from "@/lib/email";

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// Only enforce email verification when we can actually deliver the email.
// In production Resend is configured → verification required. Locally (no
// RESEND_API_KEY) it's relaxed so you can sign up and test without a mailbox.
const EMAIL_VERIFICATION = isEmailConfigured();

/** Slugify a band/display name into a username, unique-ified with a numeric suffix. */
async function generateUniqueUsername(base: string): Promise<string> {
  const root = slugify(base) || "band";
  let candidate = root;
  let n = 1;
  // band-name, band-name-2, band-name-3, ...
  while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

// Only enable a social provider when its credentials are present.
const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  socialProviders.apple = {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  baseURL: APP_URL,
  trustedOrigins: [APP_URL],
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: EMAIL_VERIFICATION,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Demoify password",
        html: actionEmail({
          heading: "Reset your password",
          body: "Click below to choose a new password. This link expires shortly.",
          url,
          cta: "Reset password",
        }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: EMAIL_VERIFICATION,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Demoify email",
        html: actionEmail({
          heading: "Verify your email",
          body: "Confirm your address to start sharing songs on Demoify.",
          url,
          cta: "Verify email",
        }),
      });
    },
  },
  socialProviders,
  user: {
    additionalFields: {
      // Generated in the create hook below — never accepted from the client.
      username: { type: "string", required: false, input: false },
      displayName: { type: "string", required: false, input: true },
      avatarUrl: { type: "string", required: false, input: true },
      // Server-managed credit balance; surfaced on the session for UI display.
      credits: { type: "number", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const u = user as typeof user & {
            displayName?: string;
            avatarUrl?: string | null;
            image?: string | null;
          };
          const displayName = u.displayName || u.name || "Band Name";
          return {
            data: {
              ...u,
              displayName,
              avatarUrl: u.avatarUrl ?? u.image ?? null,
              username: await generateUniqueUsername(displayName),
            },
          };
        },
      },
    },
  },
});

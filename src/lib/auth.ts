import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";
import { uniqueUserUsername } from "@/lib/username";
import { sendEmail, actionEmail, isEmailConfigured } from "@/lib/email";
import { assertCanDeleteAccount } from "@/lib/account-deletion";

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// Only enforce email verification when we can actually deliver the email.
// In production Resend is configured → verification required. Locally (no
// RESEND_API_KEY) it's relaxed so you can sign up and test without a mailbox.
const EMAIL_VERIFICATION = isEmailConfigured();

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
      // The chosen handle from signup; re-normalized + uniqued in the create
      // hook below, so the client value is a suggestion, never trusted raw.
      username: { type: "string", required: false, input: true },
      displayName: { type: "string", required: false, input: true },
      avatarUrl: { type: "string", required: false, input: true },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Confirm your new Demoify email",
          html: actionEmail({
            heading: "Confirm your email change",
            body: `Click below to confirm changing your Demoify email to ${newEmail}. If you didn't request this, ignore this message.`,
            url,
            cta: "Confirm email change",
          }),
        });
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await assertCanDeleteAccount(user.id);
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Signup creates only the user account (identified by a username). The
        // user creates their first artist/band profile as a separate step
        // (see createArtistProfile) — no band is auto-created here.
        before: async (user) => {
          const u = user as typeof user & {
            username?: string;
            displayName?: string;
            avatarUrl?: string | null;
            image?: string | null;
          };
          // Email signups send a (pre-checked) username; social signups don't,
          // so fall back to their name. uniqueUserUsername slugifies + uniques.
          const base = u.username || u.displayName || u.name || "user";
          const username = await uniqueUserUsername(base);
          return {
            data: {
              ...u,
              username,
              displayName: u.displayName || u.username || u.name || username,
              avatarUrl: u.avatarUrl ?? u.image ?? null,
            },
          };
        },
      },
    },
  },
});

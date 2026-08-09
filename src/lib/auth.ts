import { cookies } from "next/headers";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { captcha } from "better-auth/plugins";
import { REF_COOKIE, normalizeRefSource } from "@/lib/attribution";
import { prisma } from "@/lib/db";
import { uniqueUserUsername } from "@/lib/username";
import { sendEmail, actionEmail } from "@/lib/email";
import { assertCanDeleteAccount } from "@/lib/account-deletion";
import { requireEmailVerification, warnIfUndeliverable } from "@/lib/verification";

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// Whether an unverified account is held to read-only. Governed by
// REQUIRE_EMAIL_VERIFICATION (unset ⇒ on in production), NOT by whether Resend
// happens to be configured — see src/lib/verification.ts for why that matters.
const EMAIL_VERIFICATION = requireEmailVerification();
warnIfUndeliverable();

// Bot check on the endpoints an attacker would automate. Registered only when
// the secret is present, so unconfigured environments are unaffected.
//
// The endpoint list is set EXPLICITLY: the plugin's default includes
// /sign-in/email, and there is no captcha widget on the login form, so
// accepting the default would break every login. Conversely
// /request-password-reset IS listed, so forgot-password must send a token too.
const captchaPlugins = process.env.TURNSTILE_SECRET_KEY
  ? [
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: process.env.TURNSTILE_SECRET_KEY,
        endpoints: ["/sign-up/email", "/send-verification-email", "/request-password-reset"],
        allowedHostnames: [new URL(APP_URL).hostname],
      }),
    ]
  : [];

/**
 * The first-touch channel tag for the signup in flight, or null.
 *
 * Set by src/proxy.ts when the visitor landed on a tagged link. Deliberately
 * fail-soft: attribution is a reporting nicety and signup is not, so a missing
 * request scope or an unreadable cookie must cost us the tag, never the
 * account. Re-normalized on the way out — the cookie is client-visible storage
 * even though it is httpOnly, and this value goes straight into the database.
 */
async function refSourceFromCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    return normalizeRefSource(store.get(REF_COOKIE)?.value);
  } catch {
    return null;
  }
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
  plugins: captchaPlugins,
  advanced: {
    // Better Auth defaults to x-forwarded-for[0], which is attacker-controlled
    // behind Cloudflare: the edge APPENDS the real client IP rather than
    // replacing the header, so a client-supplied value stays at index 0. That
    // makes every IP-keyed rate-limit bucket trivially rotated, and stores junk
    // in session.ipAddress. CF-Connecting-IP is always overwritten at the edge.
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
  },
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
      // Acquisition channel, filled from the demoify_ref cookie in the create
      // hook below. `input: false` is the point: declaring it keeps the field
      // in Better Auth's user schema so the adapter persists it, while refusing
      // it from the signup payload — otherwise anyone could POST their own
      // refSource and the channel ranking would be a suggestion box.
      refSource: { type: "string", required: false, input: false },
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

          // Social signups normally arrive pre-verified: Better Auth maps the
          // provider's `email_verified` claim straight through (Google and
          // Apple both send it). If one ever doesn't, that user lands read-only
          // with no password — so no reset flow to trigger a resend against.
          // Don't force the flag; just make the situation visible in logs.
          const isSocialSignup = !u.username;
          if (isSocialSignup && u.emailVerified !== true) {
            console.warn(
              `[auth] Social signup for ${u.email} arrived with emailVerified=${u.emailVerified} — ` +
                "this account will be read-only until verified.",
            );
          }
          return {
            data: {
              ...u,
              username,
              displayName: u.displayName || u.username || u.name || username,
              avatarUrl: u.avatarUrl ?? u.image ?? null,
              // First touch only: written once here, never updated afterwards.
              refSource: await refSourceFromCookie(),
            },
          };
        },
      },
    },
  },
});

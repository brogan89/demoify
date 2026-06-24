import { Resend } from "resend";

/** True when Resend is configured (transactional email enabled). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** From address for outgoing mail; must be on a Resend-verified domain. */
function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Demoify <noreply@demoify.app>";
}

let client: Resend | null = null;

function resend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Resend is not configured — set RESEND_API_KEY to enable email.");
  }
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/**
 * Send a transactional email. No-ops with a warning when Resend is unconfigured
 * so local dev / un-provisioned environments don't crash auth flows.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn(`[email] RESEND_API_KEY unset — skipped email to ${opts.to}: ${opts.subject}`);
    return;
  }
  const { error } = await resend().emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}

/** Minimal branded button-link email body. */
export function actionEmail(opts: { heading: string; body: string; url: string; cta: string }): string {
  return `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 12px">${opts.heading}</h1>
    <p style="color:#444;line-height:1.5;margin:0 0 20px">${opts.body}</p>
    <a href="${opts.url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">${opts.cta}</a>
    <p style="color:#888;font-size:12px;margin:20px 0 0">If the button doesn't work, paste this link:<br>${opts.url}</p>
  </div>`;
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getActiveBand } from "@/lib/band";
import { isStripeConfigured, stripe, appUrl } from "@/lib/stripe";
import { getPackage, creditsEnabled } from "@/lib/credits";

export async function POST(req: Request) {
  if (!creditsEnabled()) {
    return NextResponse.json(
      { error: "The credit economy is disabled on this instance." },
      { status: 503 },
    );
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured. Set STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Credits are purchased for the band the user is currently acting as.
  const active = await getActiveBand();
  if (!active) return NextResponse.json({ error: "No active band" }, { status: 400 });

  const { packageId } = await req.json().catch(() => ({}));
  const pack = getPackage(packageId);
  if (!pack) return NextResponse.json({ error: "Unknown package" }, { status: 400 });

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl()}/dashboard/credits?purchase=success`,
    cancel_url: `${appUrl()}/dashboard/credits?purchase=cancelled`,
    client_reference_id: active.band.id,
    metadata: { bandId: active.band.id, packageId: pack.id, credits: String(pack.credits) },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pack.priceCents,
          product_data: { name: `${pack.credits} Demoify credits (${pack.label})` },
        },
      },
    ],
  });

  return NextResponse.json({ url: session.url });
}

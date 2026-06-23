import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { isStripeConfigured, stripe, appUrl } from "@/lib/stripe";
import { getPackage } from "@/lib/credits";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured. Set STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { packageId } = await req.json().catch(() => ({}));
  const pack = getPackage(packageId);
  if (!pack) return NextResponse.json({ error: "Unknown package" }, { status: 400 });

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl()}/dashboard/credits?purchase=success`,
    cancel_url: `${appUrl()}/dashboard/credits?purchase=cancelled`,
    client_reference_id: user.id,
    metadata: { userId: user.id, packageId: pack.id, credits: String(pack.credits) },
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

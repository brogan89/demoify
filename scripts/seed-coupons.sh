#!/usr/bin/env bash
# =============================================================================
# seed-coupons.sh — Create free-credit coupon codes for Demoify early adopters
# =============================================================================
# This script inserts coupon codes directly into the production D1 database.
# Run it after ADMIN_EMAILS is configured and you've verified admin access.
#
# Usage:
#   chmod +x seed-coupons.sh
#   ./seed-coupons.sh                        # dry-run (safe, just prints SQL)
#   ./seed-coupons.sh --apply                # actually inserts into D1
#   ./seed-coupons.sh --apply --remote       # targets production D1
#
# Requirements:
#   - wrangler CLI (via npx) with CLOUDFLARE_API_TOKEN set
#   - Production D1 database "demoify" (id: 528fd335-23b4-4922-9e44-c83e94d50bd9)
# =============================================================================

set -euo pipefail

MODE="${1:---dry-run}"  # --dry-run | --apply
TARGET="${2:---local}"  # --local | --remote

# ---- Coupon definitions -----------------------------------------------------
# FREE_CREDITS coupons: amount is the number of credits granted on redemption.
# 1 credit = $0.01 USD. Upload costs 10 credits per song.
# Each coupon is capped at 100 redemptions = the "first 100 users get bonus credits" plan.
# -----------------------------------------------------------------------------

COUPONS=(
  # Code              Kind           Amount   MaxRedemptions  Expires   Description
  "DEMOIFY100         FREE_CREDITS   500      100              2026-08-31  First 100 users get 500 bonus credits ($5 value)"
  "WELCOME250         FREE_CREDITS   250      null             null        General welcome code (unlimited)"
  "LAUNCH100          FREE_CREDITS   100      100              2026-08-31  100 users get 100 credits each"
  "EARLYBIRD          FREE_CREDITS   300      200              2026-09-30  Early adopter bonus (200 users)"
  "MUSICSCHOOL        FREE_CREDITS   1000     50               2026-12-31  Institutional music school codes (50 redemptions)"
)

# ---- Build and print SQL ----------------------------------------------------

echo "=== Demoify Coupon Seed Script ==="
echo "Mode:   $MODE"
echo "Target: $TARGET"
echo ""

for coupon in "${COUPONS[@]}"; do
  read -r code kind amount max_redemptions expires description <<< "$coupon"

  # Generate a CUID-like ID for the coupon
  ID="seed-$(echo "$code" | tr '[:upper:]' '[:lower:]' | tr -d '\n')"

  # Convert expires to ISO date string if not null
  EXPIRES_SQL="null"
  if [ "$expires" != "null" ]; then
    EXPIRES_SQL="'${expires}T23:59:59Z'"
  fi

  # Convert max_redemptions to SQL
  MAX_SQL="null"
  if [ "$max_redemptions" != "null" ]; then
    MAX_SQL="$max_redemptions"
  fi

  SQL="INSERT OR IGNORE INTO coupon (id, code, kind, amount, maxRedemptions, redemptionCount, active, expiresAt, createdAt)
VALUES ('$ID', '$code', '$kind', $amount, $MAX_SQL, 0, 1, $EXPIRES_SQL, '$(date -u +%Y-%m-%dT%H:%M:%SZ)');"

  echo "--- $code: $description ---"
  echo "$SQL"
  echo ""

  if [ "$MODE" = "--apply" ]; then
    echo "  → Executing on $TARGET D1..."
    npx wrangler d1 execute demoify --"$TARGET" --command="$SQL"
    echo ""
  fi
done

echo "=== Done ==="
if [ "$MODE" = "--dry-run" ]; then
  echo "Dry-run complete. Run with --apply --remote to insert into production."
fi

echo ""
echo "After seeding, verify at: https://demoify.app/admin/coupons"
echo "Existing coupons with the same code will be skipped (INSERT OR IGNORE)."
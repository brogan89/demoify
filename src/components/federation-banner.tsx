import { federationHubEnabled } from "@/lib/federation";
import { FederationBannerClient } from "@/components/federation-banner-client";

/**
 * Server wrapper for the federation announcement banner.
 * Only renders the client banner when this instance acts as a hub
 * (FEDERATION_HUB_ENABLED=true). The client component handles dismiss
 * state in localStorage.
 */
export function FederationBanner() {
  if (!federationHubEnabled()) return null;

  return <FederationBannerClient />;
}

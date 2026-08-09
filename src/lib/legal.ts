/**
 * Shared constants for the legal pages (/terms, /privacy, /dmca).
 *
 * Kept out of the page files so the three of them, the footer, and the sitemap
 * can't drift apart — a copyright contact that appears differently on two pages
 * is worse than no contact at all.
 *
 * NOTE: `LEGAL_CONTACT_EMAIL` must be a genuinely monitored mailbox. A DMCA
 * notice sent here and ignored is the failure mode that costs a takedown
 * dispute, and mods of music communities do check that the address resolves.
 */

/** Monitored mailbox for copyright, privacy, and legal correspondence. */
export const LEGAL_CONTACT_EMAIL = "legal@demoify.app";

/**
 * Last substantive revision, shown on each page. Bump this whenever the terms
 * change in a way a user would care about — not for typo fixes.
 */
export const LEGAL_LAST_UPDATED = "9 August 2026";

/** Operating entity and jurisdiction, referenced by the terms and privacy pages. */
export const LEGAL_OPERATOR = "Demoify, operated as a sole trader from Hamilton, New Zealand";

/** Legal routes, for the footer and the sitemap. */
export const LEGAL_ROUTES = ["/terms", "/privacy", "/dmca"] as const;

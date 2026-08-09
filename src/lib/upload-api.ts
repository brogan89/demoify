/**
 * Wire types for POST /api/upload/presign.
 *
 * Types only, no runtime exports — five client components import this, and
 * pulling in src/lib/r2.ts (which drags the AWS SDK) just to describe a JSON
 * shape would be a real bundle cost.
 *
 * These exist because `Response.json()` is typed `Promise<unknown>` once
 * Cloudflare's generated runtime types are present, so every consumer needs to
 * say what it expects. Writing that shape down once beats five inline casts
 * drifting apart.
 */

/** 200 response from the presign route. */
export type PresignSuccess = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
};

/** Any non-2xx from the presign route, and the `.catch()` fallback shape. */
export type PresignError = { error?: string };

/** Accepted request body. Every field is optional — the route validates. */
export type PresignRequest = {
  kind?: "song" | "logo" | "avatar" | "artwork";
  contentType?: string;
  fileName?: string;
  bandId?: string;
  projectId?: string;
};

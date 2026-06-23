import { S3Client } from "@aws-sdk/client-s3";

/** True when all R2 env vars are present (uploads are enabled). */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_URL,
  );
}

export const R2_BUCKET = process.env.R2_BUCKET ?? "";
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

let client: S3Client | null = null;

/** Lazily-constructed S3 client pointed at the Cloudflare R2 endpoint. */
export function r2(): S3Client {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured — set R2_* env vars to enable uploads.");
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

/** Public URL for a stored object key. */
export function publicUrlFor(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

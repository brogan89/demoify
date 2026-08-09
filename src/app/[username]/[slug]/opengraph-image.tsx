import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  OG_FG,
  OG_MUTED,
  BRAND_FROM,
  BRAND_TO,
  OgFrame,
  OgWordmark,
  truncate,
} from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "A song on Demoify";

/** Refuse artwork that is missing, huge, or not actually an image. */
const MAX_ARTWORK_BYTES = 2_000_000;

/**
 * Pull the sleeve into a data URL.
 *
 * Satori can fetch a remote `<img src>` itself, but a failure there rejects
 * while the response body is streaming — far too late to fall back. Fetching
 * up front means a dead CDN URL costs us the artwork, not the whole card.
 */
async function artworkDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;

    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_ARTWORK_BYTES) return null;

    return `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;

  const project = await prisma.songProject.findFirst({
    where: { slug, band: { username } },
    select: {
      title: true,
      visibility: true,
      artworkUrl: true,
      band: { select: { displayName: true, avatarUrl: true } },
      _count: { select: { versions: true } },
    },
  });

  // Private and missing songs both get the neutral card — an OG image must
  // never leak the title of a song its owner has kept private.
  if (!project || project.visibility === "PRIVATE") {
    return new ImageResponse(
      (
        <OgFrame>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              color: OG_FG,
              letterSpacing: -1.5,
            }}
          >
            Demoify
          </div>
          <OgWordmark />
        </OgFrame>
      ),
      { ...OG_SIZE },
    );
  }

  const artwork = await artworkDataUrl(project.artworkUrl ?? project.band.avatarUrl);
  const versions = project._count.versions;

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          {/* Sleeve: real artwork when we got it, brand gradient when we didn't. */}
          <div
            style={{
              width: 260,
              height: 260,
              display: "flex",
              flexShrink: 0,
              borderRadius: 24,
              overflow: "hidden",
              backgroundImage: `linear-gradient(135deg, ${BRAND_FROM}, ${BRAND_TO})`,
            }}
          >
            {artwork ? (
              <img
                src={artwork}
                width={260}
                height={260}
                style={{ width: 260, height: 260, objectFit: "cover" }}
                alt=""
              />
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              maxWidth: 700,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 62,
                fontWeight: 700,
                lineHeight: 1.08,
                color: OG_FG,
                letterSpacing: -1.5,
              }}
            >
              {truncate(project.title, 60)}
            </div>
            <div style={{ display: "flex", fontSize: 34, color: OG_MUTED }}>
              by {truncate(project.band.displayName, 40)}
            </div>
            {versions > 0 && (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  marginTop: 6,
                  padding: "10px 22px",
                  borderRadius: 9999,
                  fontSize: 26,
                  color: OG_FG,
                  backgroundImage: `linear-gradient(135deg, ${BRAND_FROM}, ${BRAND_TO})`,
                }}
              >
                {versions === 1 ? "1 version" : `${versions} versions`}
              </div>
            )}
          </div>
        </div>

        <OgWordmark />
      </OgFrame>
    ),
    { ...OG_SIZE },
  );
}

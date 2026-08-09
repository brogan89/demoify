import { ImageResponse } from "next/og";
import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  OG_FG,
  OG_MUTED,
  OgFrame,
  OgWordmark,
} from "@/lib/og";

// Inherited by every route that doesn't define its own opengraph-image.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Demoify — the permanent link for a song in progress";

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              color: OG_FG,
              letterSpacing: -2,
            }}
          >
            The permanent link for a song in progress.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              lineHeight: 1.35,
              color: OG_MUTED,
              maxWidth: 900,
            }}
          >
            Push new versions like code — the link never breaks, every take is kept, and
            feedback lands on the exact version.
          </div>
        </div>
        <OgWordmark />
      </OgFrame>
    ),
    { ...OG_SIZE },
  );
}

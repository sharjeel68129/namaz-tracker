import { ImageResponse } from "next/og";
import { DESCRIPTION, SITE_NAME } from "@/lib/site";

// The picture shown when a link to the site is shared.
export const alt = `${SITE_NAME}: a gold crescent beside the words "${DESCRIPTION}"`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 72, padding: 96, background: "#171614", color: "#f1eadb" }}>
        {/* The crescent: a gold disc with a background-coloured disc laid over its upper right. */}
        <div style={{ display: "flex", position: "relative", width: 260, height: 260, flexShrink: 0 }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 260, height: 260, borderRadius: 130, background: "#d9b36a" }} />
          <div style={{ position: "absolute", left: 63, top: -3, width: 218, height: 218, borderRadius: 109, background: "#171614" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 660 }}>
          <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>{SITE_NAME}</div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 36, lineHeight: 1.3, color: "#b5ad9d" }}>{DESCRIPTION}</div>
        </div>
      </div>
    ),
    size
  );
}

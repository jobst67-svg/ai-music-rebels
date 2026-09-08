import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AI Music Rebels logo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#050505"
    }}>
      <img
        src="https://aimusicrebels.com/ai-music-rebels-logo.webp"
        alt="AI Music Rebels"
        width="520"
        height="520"
        style={{ objectFit: "contain" }}
      />
    </div>,
    { ...size }
  );
}

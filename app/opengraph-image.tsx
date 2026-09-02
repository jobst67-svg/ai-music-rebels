import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AI Music Rebels";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "72px", background: "#101116", color: "#f6f4ef", fontFamily: "Arial" }}>
      <div style={{ display: "flex", color: "#d9ff3f", fontSize: 28, fontWeight: 800, letterSpacing: 4 }}>AI MUSIC REBELS</div>
      <div style={{ display: "flex", marginTop: 34, fontSize: 82, lineHeight: 1, fontWeight: 900, letterSpacing: -4 }}>Break the rules.</div>
      <div style={{ display: "flex", marginTop: 8, fontSize: 82, lineHeight: 1, fontWeight: 900, letterSpacing: -4 }}>Claim your sound.</div>
      <div style={{ display: "flex", marginTop: 34, fontSize: 25, color: "#c9cbd0" }}>Your name. Your page. Your rebellion.</div>
    </div>,
    { ...size }
  );
}

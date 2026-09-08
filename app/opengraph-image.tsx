import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AI Music Rebels logo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export default async function OpenGraphImage() {
  const logoResponse = await fetch("https://aimusicrebels.com/ai-music-rebels-logo.webp", {
    cache: "no-store"
  });
  const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
  const logoDataUrl = `data:image/webp;base64,${toBase64(logoBytes)}`;

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
        src={logoDataUrl}
        alt="AI Music Rebels"
        width="520"
        height="520"
        style={{ objectFit: "contain" }}
      />
    </div>,
    { ...size }
  );
}

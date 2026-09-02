import { NextRequest, NextResponse } from "next/server";

const baseDomain = ".aimusicrebels.com";

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase() ?? "";
  const subdomain = hostname.endsWith(baseDomain) ? hostname.slice(0, -baseDomain.length) : "";
  const isArtistSubdomain = Boolean(subdomain && subdomain !== "www" && /^[a-z0-9-]+$/.test(subdomain));
  const pathname = request.nextUrl.pathname;

  // A channel's public root (and the formerly shared private-preview URL) show the same public artist page.
  if (isArtistSubdomain && (pathname === "/" || pathname === "/account/preview")) {
    const url = request.nextUrl.clone();
    url.pathname = `/artist/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ["/", "/account/preview"]
};

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getRequestUser, isAdminUser } from "@/lib/billing";
import { sendCustomEmail } from "@/lib/resend";

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!isAdminUser(user)) return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });

  try {
    const body = await request.json() as { to?: string; subject?: string; html?: string };
    const to = body.to?.trim() ?? "";
    const subject = body.subject?.trim() ?? "";
    const html = body.html?.trim() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "Bitte eine gültige Empfänger-E-Mail-Adresse eingeben." }, { status: 400 });
    if (!subject || subject.length > 180) return NextResponse.json({ error: "Bitte einen Betreff mit maximal 180 Zeichen eingeben." }, { status: 400 });
    if (!html || html.length > 200_000) return NextResponse.json({ error: "Der HTML-Inhalt fehlt oder ist zu groß." }, { status: 400 });

    await sendCustomEmail({ to, subject, html, text: htmlToText(html), idempotencyKey: `admin-mail-${randomUUID()}` });
    return NextResponse.json({ message: `E-Mail wurde an ${to} gesendet.` });
  } catch (error) {
    console.error("[admin/send-email] failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "E-Mail konnte nicht gesendet werden." }, { status: 500 });
  }
}

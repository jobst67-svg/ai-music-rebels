import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Der E-Mail-Versand ist noch nicht eingerichtet.");
  return new Resend(key);
}

const from = process.env.RESEND_FROM_EMAIL ?? "AI Music Rebels <noreply@vtk-song-studio.com>";
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? "info@aimusicrebels.com";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] ?? character);

export async function sendBillingEmail({ to, subject, preview, content, idempotencyKey }: { to: string; subject: string; preview: string; content: string; idempotencyKey: string }) {
  const safeSubject = escapeHtml(subject);
  const result = await getResend().emails.send({
    from,
    to,
    subject,
    html: `<main style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px;background:#101116;color:#f6f4ef"><p style="color:#d9ff3f;font-weight:800;letter-spacing:.08em">AI MUSIC REBELS</p><h1 style="font-size:30px;margin:0 0 18px">${safeSubject}</h1><p style="line-height:1.6;color:#e7e7e8">${escapeHtml(content)}</p><p style="margin-top:30px;color:#a9ad9f;font-size:13px">${escapeHtml(preview)}</p></main>`
  }, { headers: { "Idempotency-Key": idempotencyKey } });
  if (result.error) throw new Error(result.error.message);
}

export function sendAdminEmail({ subject, preview, content, idempotencyKey }: Omit<Parameters<typeof sendBillingEmail>[0], "to">) {
  return sendBillingEmail({ to: adminEmail, subject, preview, content, idempotencyKey });
}

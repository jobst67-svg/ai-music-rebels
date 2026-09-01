import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase";

export type BillingStatus = "pending" | "trialing" | "active" | "past_due" | "basic" | "cancelled";

export type BillingProfile = {
  id: string;
  user_id: string;
  slug: string;
  artist_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_started_at: string | null;
};

function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Die sichere Supabase-Verbindung für Zahlungen ist noch nicht eingerichtet.");
  return key;
}

export function getBillingAdmin() {
  return createClient(supabaseUrl, serviceKey(), { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function getRequestUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

export function statusFromStripe(status: string): BillingStatus {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") return "basic";
  return "pending";
}

export function isFullChannel(status: BillingStatus) {
  return status === "trialing" || status === "active" || status === "past_due";
}

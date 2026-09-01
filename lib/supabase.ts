import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://xigciipjwwzaqucjecvt.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

export function getSupabase() {
  if (!hasSupabaseConfig) {
    throw new Error("Supabase is not configured. Add the public environment variables in Vercel.");
  }

  return createClient(supabaseUrl, supabaseKey);
}

export { supabaseUrl, supabaseKey };

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://xigciipjwwzaqucjecvt.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_HeUqhtWpQKXPxA-Y2mOzBg_H2vZbwYb";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

export function getSupabase() {
  return createClient(supabaseUrl, supabaseKey);
}

export { supabaseUrl, supabaseKey };

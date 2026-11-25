"use server";

import { createSupabase } from "@/lib/supabase/server";

/**
 * Short-lived access token for the inbox's Realtime subscription. Session cookies are httpOnly,
 * so browser code can't read them; Realtime verifies this token and applies RLS for the user.
 */
export async function realtimeToken(): Promise<string | null> {
  const supabase = await createSupabase();
  if (!supabase) return null;
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";
import type { Database } from "@/lib/database.types";

/**
 * Cookie-less client for data every visitor sees the same way (categories, sponsor cards).
 * It acts as the anonymous role, so results are safe to cache and share across requests.
 */
export function publicSupabase() {
  const config = supabaseConfig();
  return config ? createClient<Database>(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

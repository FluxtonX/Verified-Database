import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/**
 * Cookie-less client for data every visitor sees the same way (categories, sponsor cards).
 * It acts as the anonymous role, so results are safe to cache and share across requests.
 */
export function publicSupabase() {
  const config = supabaseConfig();
  return config ? createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

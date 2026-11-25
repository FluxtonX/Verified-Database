import "server-only";
import type { createSupabase } from "@/lib/supabase/server";
import { logError } from "@/lib/log";

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;

/** Provider calls are slow and use the founder's key, so cap them per user (20 per hour, see
 * migration 20261125000200). Only an explicit limit rejection blocks; other errors fail open. */
export async function importAllowed(supabase: Supabase) {
  const { error } = await supabase.rpc("consume_rate_limit", { p_bucket: "import" });
  if (!error) return true;
  if (error.code === "P0005") return false;
  logError("rate_limit.import_check", error);
  return true;
}

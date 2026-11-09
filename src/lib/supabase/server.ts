import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export async function createSupabase() {
  const config = supabaseConfig();
  if (!config) return null;

  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: { httpOnly: true },
    cookies: {
      getAll: () => store.getAll(),
      setAll(changes) {
        try {
          changes.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Proxy refreshes cookies before rendering Server Components.
        }
      },
    },
  });
}

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return null;
  if (!url || !key) throw new Error("Set both Supabase environment variables.");
  return { url, key };
}

export function appOrigin() {
  return new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
}

export const oauthDestinationCookie = "verified-oauth-destination";

export function loginDestination(value: unknown) {
  if (typeof value === "string" && value.length <= 1024) {
    // Allow only known local routes and dashboard parameters; never external redirects.
    const listing = /^\/acquire\/([a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}|[a-z0-9-]+)(\?intent=inquiry)?$/i;
    if (listing.test(value)) return value;
    if (value.startsWith("/dashboard?")) {
      const url = new URL(value, "http://local");
      const allowed = new Set(["mode", "tab", "thread", "startup", "view", "folder", "filter", "returnTo"]);
      if ([...url.searchParams.keys()].every(key => allowed.has(key)) && !url.hash) return url.pathname + url.search;
    }
  }
  switch (value) {
    case "/?submit=1":
    case "/acquire":
    case "/advertise":
    case "/acquire?submit=1":
    case "/dashboard":
    case "/dashboard?tab=settings&mode=seller":
    case "/":
      return value;
    default:
      return "/";
  }
}

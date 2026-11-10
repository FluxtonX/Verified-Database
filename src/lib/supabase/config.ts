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

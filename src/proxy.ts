import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginDestination, supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = supabaseConfig();
  let response = NextResponse.next({ request });
  if (!config) return response;

  const supabase = createServerClient(config.url, config.key, {
    cookieOptions: { httpOnly: true },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(changes, headers) {
        changes.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        changes.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();

  // Private areas: redirect before rendering, so signed-out visitors get a real 307 instead of
  // a streamed loading skeleton. The pages still check the session themselves.
  const { pathname, search } = request.nextUrl;
  if (!data?.claims.sub && (pathname === "/dashboard" || pathname.startsWith("/startup/"))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname === "/dashboard" ? loginDestination(pathname + search) : "/dashboard");
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}

export const config = { matcher: ["/", "/acquire/:path*", "/advertise", "/login", "/dashboard", "/startup/:path*"] };

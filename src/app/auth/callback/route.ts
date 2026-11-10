import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, loginDestination, oauthDestinationCookie } from "@/lib/supabase/config";
import { createSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  const next = loginDestination(request.cookies.get(oauthDestinationCookie)?.value);
  function finish(destination: URL) {
    const response = NextResponse.redirect(destination);
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(oauthDestinationCookie, "", { path: "/auth/callback", maxAge: 0 });
    return response;
  }

  const supabase = await createSupabase();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (!error) return finish(new URL(next, appOrigin()));
  }

  const login = new URL("/login", appOrigin());
  login.searchParams.set("next", next);
  login.searchParams.set("error", "callback");
  return finish(login);
}

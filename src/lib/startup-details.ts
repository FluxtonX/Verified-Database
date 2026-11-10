export function startupWebsite(value: string) {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    url.hash = "";
    const playId = url.hostname === "play.google.com" && url.pathname === "/store/apps/details" ? url.searchParams.get("id") : null;
    url.search = "";
    if (playId) url.searchParams.set("id", playId);
    return url.href.length <= 2048 ? url.href : null;
  } catch {
    return null;
  }
}

export function startupHandle(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().replace(/^@/, "") : "";
}

export const startupTeamSizes = ["1", "2–5", "6–10", "11–25", "26–50", "51+"] as const;

export const startupDetailsColumns = "id,name,description,website_url,x_handle,country,mobile_app,funding,team_size,founded_on,profit_margin_pct,markets,tech_stack,marketing_channels,value_proposition,problem_solved,app_store_url,google_play_url,audience_description,pricing,additional_info,imported_logo_url";

export function storeLink(value: string, hostname: string) {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.host === hostname && !url.username && !url.password && url.href.length <= 2048 ? url.href : null;
  } catch {
    return null;
  }
}

/** Tag outbound sponsor clicks consistently, including older catalog records. */
export function sponsorCardUrl(destination: string): string | null {
  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return null;
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;

  // The imported reference catalog used another publisher's Higgsfield link.
  // Use the normal destination until the advertiser supplies our own partner URL.
  if (["higgsfield.ai", "www.higgsfield.ai"].includes(url.hostname)) {
    if (/^\/marclou\/?$/i.test(url.pathname)) url.pathname = "/";
    if (url.searchParams.get("invite_code")?.toLowerCase() === "marclou") url.searchParams.delete("invite_code");
  }
  if (url.searchParams.get("ref")?.toLowerCase() === "trustmrr") url.searchParams.delete("ref");

  // Replace old campaign attribution, keeping destination-specific parameters,
  // legitimate partner IDs, paths and fragments intact.
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  }
  url.searchParams.set("utm_source", "verifeddb");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "sponsor_card");
  return url.href;
}

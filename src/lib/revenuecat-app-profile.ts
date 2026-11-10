import { storeLink } from "./startup-details";
import { importedLogoUrl } from "./startup-logo";

export type RevenueCatApp = {
  type: string;
  app_store?: { bundle_id?: string | null };
  play_store?: { package_name?: string | null };
};

type AppleListing = {
  bundleId: string;
  trackViewUrl?: string;
  artworkUrl512?: string;
  artworkUrl100?: string;
  description?: string;
};

function singleIdentifier(values: (string | null | undefined)[]) {
  const ids = [...new Set(values.filter(value => typeof value === "string" && /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+$/.test(value)))];
  return ids.length === 1 ? ids[0] : undefined;
}

async function appleListing(bundleId: string) {
  const url = new URL("https://itunes.apple.com/lookup");
  url.search = new URLSearchParams({ bundleId, entity: "software", country: "us" }).toString();

  try {
    const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return undefined;
    const { results } = await response.json() as { results?: AppleListing[] };
    return results?.find(result => result.bundleId === bundleId);
  } catch {
    return undefined;
  }
}

export async function revenueCatAppProfile(apps: RevenueCatApp[], projectIcon?: string | null) {
  const bundleId = singleIdentifier(apps.filter(app => app.type === "app_store").map(app => app.app_store?.bundle_id));
  const packageName = singleIdentifier(apps.filter(app => app.type === "play_store").map(app => app.play_store?.package_name));
  const listing = bundleId ? await appleListing(bundleId) : undefined;
  const appStore = storeLink(listing?.trackViewUrl ?? "", "apps.apple.com");
  const googlePlay = packageName ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}` : null;
  const logo = importedLogoUrl(listing?.artworkUrl512) ?? importedLogoUrl(listing?.artworkUrl100) ?? importedLogoUrl(projectIcon);

  return {
    website: appStore ?? googlePlay,
    description: listing?.description?.trim().slice(0, 500) ?? "",
    appProfile: {
      app_store_url: appStore,
      google_play_url: googlePlay,
      logo_url: logo,
      mobile_app: apps.some(app => app.type === "app_store" || app.type === "play_store"),
    },
  };
}

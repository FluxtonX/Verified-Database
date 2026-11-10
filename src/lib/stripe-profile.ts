import { startupWebsite } from "./startup-details";

type StripeAccount = {
  id?: string;
  object?: string;
  country?: string;
  default_currency?: string;
  business_profile?: { name?: string | null; url?: string | null; product_description?: string | null } | null;
  settings?: { dashboard?: { display_name?: string | null } | null } | null;
};

export async function readStripeProfile(key: string) {
  if (!/^rk_live_[a-zA-Z0-9]{10,240}$/.test(key)) {
    return { error: "Enter a live restricted Stripe key that starts with rk_live_." };
  }

  try {
    const response = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });

    if (response.status === 401) return { error: "Stripe rejected this key. Check it or create a new restricted key." };
    if (response.status === 403) return { error: "This key can’t read the Stripe account. Create a restricted key with the setup link." };
    if (!response.ok) return { error: "Stripe is temporarily unavailable. Try again in a moment." };

    const account: StripeAccount = await response.json();
    if (account.object !== "account" || !account.id || !/^acct_[a-zA-Z0-9]+$/.test(account.id)) {
      return { error: "Stripe didn’t return an account for this key." };
    }

    const name = account.business_profile?.name?.trim() || account.settings?.dashboard?.display_name?.trim();
    const website = startupWebsite(account.business_profile?.url?.trim() ?? "");
    return {
      defaultCurrency: account.default_currency?.toUpperCase() || "USD",
      profile: {
        stripe_account_id: account.id,
        name: (name || (website && new URL(website).hostname.replace(/^www\./, "")) || "Untitled startup").slice(0, 100),
        website_url: website,
        description: account.business_profile?.product_description?.trim().slice(0, 500) ?? "",
        country: account.country && /^[A-Z]{2}$/.test(account.country) ? account.country : null,
      },
    };
  } catch {
    return { error: "Couldn’t reach Stripe. Check your connection and try again." };
  }
}

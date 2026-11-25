export type SponsorPrice = { id: string; label: string };

export type SponsorCard = {
  id: string;
  name: string;
  headline: string;
  website_url: string;
  logo_url: string | null;
  background_color: string;
  home_positions: number[];
  marketplace_positions: number[];
};

export type SponsorCatalog = {
  capacity: number;
  available: number;
  cards: SponsorCard[];
};

export type Sponsorship = Pick<SponsorCard, "id"> & {
  owner_id: string;
  state: "checkout" | "active" | "paused" | "ended";
  checkout_expires_at: string;
  checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  name: string | null;
  headline: string | null;
  website_url: string | null;
  logo_url: string | null;
};

/**
 * Cards that advertisers actually published. Paid cards always carry an uploaded or HTTPS logo;
 * a bundled `/assets/` logo only ever came from the old seed rows, which listed companies
 * that never bought a sponsorship. Hide those even before the cleanup migration runs.
 */
export function publishedSponsorCards(cards: SponsorCard[]) {
  return cards.filter(card => !card.logo_url?.startsWith("/assets/"));
}

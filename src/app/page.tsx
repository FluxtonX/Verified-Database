import { readSponsorCatalog, readSponsorPrice, sponsorCheckoutEnabled } from "@/lib/sponsor-billing";
import Home from "@/components/Home";
import { catalogContext, readHome } from "@/lib/catalog";

export default async function HomePage({ searchParams }: {
  searchParams: Promise<{ submit?: string; publishedSponsor?: string }>;
}) {
  const [context, params] = await Promise.all([catalogContext(), searchParams]);
  const [catalog, sponsors, sponsorPrice] = await Promise.all([
    context && readHome(context.supabase),
    context ? readSponsorCatalog(context.supabase) : null,
    context ? readSponsorPrice() : null,
  ]);
  const publishedSponsor = sponsors?.cards.find(card => card.id === params.publishedSponsor);
  return <Home catalog={catalog} signedIn={context?.signedIn ?? false}
    sponsors={sponsors} sponsorPrice={sponsorPrice} sponsorCheckout={sponsorCheckoutEnabled()}
    publishedSponsor={publishedSponsor}
    openSubmission={params.submit === "1"} />;
}

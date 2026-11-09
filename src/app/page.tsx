import Home from "@/components/Home";
import { catalogContext, readHome } from "@/lib/catalog";

export default async function HomePage({ searchParams }: {
  searchParams: Promise<{ submit?: string }>;
}) {
  const [context, params] = await Promise.all([catalogContext(), searchParams]);
  const catalog = context && await readHome(context.supabase);
  return <Home catalog={catalog} signedIn={context?.signedIn ?? false}
    categories={context?.categories ?? []} openSubmission={params.submit === "1"} />;
}

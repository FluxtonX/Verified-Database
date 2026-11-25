import assert from "node:assert/strict";
import test from "node:test";
import { publishedSponsorCards } from "../src/lib/sponsorship.ts";

const card = (id, logo_url) => ({ id, name: id, headline: "h", website_url: "https://example.com", logo_url,
  background_color: "#ffffff", home_positions: [], marketplace_positions: [] });

test("seeded reference cards with bundled logos are never shown as sponsors", () => {
  const cards = [card("seed", "/assets/sponsor-0.png"), card("upload", "https://x.supabase.co/storage/v1/object/public/sponsor-logos/a.png"),
    card("external", "https://cdn.example.com/logo.png"), card("no-logo", null)];
  assert.deepEqual(publishedSponsorCards(cards).map(c => c.id), ["upload", "external", "no-logo"]);
});

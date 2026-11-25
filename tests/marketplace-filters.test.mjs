import assert from "node:assert/strict";
import test from "node:test";
import { emptyFilters, filterListings, filtersToSearch, parseFilters, searchTerm } from "../src/lib/marketplace-filters.ts";

test("URL filters round-trip and drop defaults", () => {
  const params = { q: "ai inbox", category: "SaaS", revenue_min: "1000", max_multiple: "3", audience: "B2B", mobile: "yes", listed: "30", country: "US", sort: "price-asc", page: "2" };
  const filters = parseFilters(params);
  assert.equal(filters.revenueMin, "1000");
  assert.equal(filters.page, 2);
  assert.equal(filtersToSearch(filters), "?q=ai+inbox&category=SaaS&revenue_min=1000&max_multiple=3&audience=B2B&mobile=yes&listed=30&country=US&sort=price-asc&page=2");
  assert.equal(filtersToSearch(emptyFilters), "");
});

test("invalid or hostile parameters fall back to no filter", () => {
  const filters = parseFilters({ revenue_min: "1e9", price_max: "abc", audience: "both", mobile: "maybe", listed: "365", country: "usa",
    founded_from: "2024-13-45", sort: "drop table", page: "-3", q: "x".repeat(500) });
  assert.deepEqual({ ...filters, q: "" }, emptyFilters);
  assert.equal(filters.q.length, 100);
  assert.equal(searchTerm('ai),name.eq."x"*%\\'), "ai name.eq. x");
});

test("sample listings use the same rules as the database", () => {
  const now = Date.parse("2026-11-25T00:00:00Z");
  const row = (id, extra) => ({ id, name: id, description: "", category: "SaaS", logo: "", private: false, featured: false, views: "0", offers: 0,
    price: 50000, priceLabel: "", oldPrice: "", revenue: 2000, revenueLabel: "", mrr: 1800, growth: 5, multiple: 2.1, margin: null,
    listedAt: "2026-11-20T00:00:00Z", foundedOn: null, country: null, audience: null, mobileApp: false, ...extra });
  const rows = [row("cheap", { price: 10000, multiple: 0.4 }), row("pricey", { price: 900000, multiple: 37.5 }), row("old", { listedAt: "2026-01-01T00:00:00Z" })];
  const ids = f => filterListings(rows.map(r => ({ ...r })), { ...emptyFilters, ...f }, now).rows.map(r => r.id);
  assert.deepEqual(ids({ priceMax: "60000" }), ["cheap", "old"]);
  assert.deepEqual(ids({ maxMultiple: "3" }), ["cheap", "old"]);
  assert.deepEqual(ids({ listed: "30" }), ["cheap", "pricey"]);
  assert.deepEqual(ids({ sort: "price-desc" }), ["pricey", "old", "cheap"]);
  assert.equal(filterListings(rows, { ...emptyFilters, page: 2 }, now).rows.length, 0);
});

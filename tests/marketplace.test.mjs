import assert from "node:assert/strict";
import test from "node:test";
import { moneyCents, listingReturn, buyerUrl } from "../src/lib/buyer-dashboard.ts";
import { listingSnapshot, dayMs, isoDay } from "../src/lib/startup-metrics.ts";
import { loginDestination } from "../src/lib/supabase/config.ts";

test("offer amounts preserve cents and reject unsupported input", () => {
  assert.equal(moneyCents("0.01"), 1);
  assert.equal(moneyCents("19999.99"), 1999999);
  assert.equal(moneyCents("100000000000"), 10000000000000);
  for (const value of ["", "0", "-1", "1e3", "Infinity", "NaN", "1.001", "1,000", "100000000000.01"]) assert.equal(moneyCents(value), null, value);
});
test("profile setup returns only to a local listing", () => {
  const listing = "/acquire/10000000-0000-4000-8000-000000000001?intent=inquiry";
  assert.equal(listingReturn(listing), listing);
  for (const value of ["https://evil.example", "//evil.example", "/acquire/../login", listing + "&redirect=https://evil.example", "/dashboard"]) assert.equal(listingReturn(value), undefined);
  const profile = buyerUrl("my-profile", { returnTo: listing });
  assert.equal(loginDestination(profile), profile);
  assert.equal(loginDestination(listing), listing);
  for (const value of ["https://evil.example", "//evil.example", "/dashboard?redirect=https://evil.example", "/acquire/../login"]) assert.equal(loginDestination(value), "/");
});
test("publishing uses exactly 30 days from one USD source", () => {
  const now = Date.parse("2026-11-17T12:00:00Z");
  const daily = Object.fromEntries(Array.from({ length: 60 }, (_, index) => [isoDay(now - index * dayMs), index < 30 ? 10.25 : 900]));
  daily["2026-11-18"] = 99999;
  const metrics = { active: 1, currencies: { USD: { daily, mrr: 100.12, lifetime: 999999 }, EUR: { daily: { "2026-11-17": 99999 }, mrr: 99999, lifetime: 99999 } } };
  assert.deepEqual(listingSnapshot(metrics, now), { revenueCents: 30750, mrrCents: 10012 });
  assert.deepEqual(listingSnapshot({ active: 0, currencies: { USD: { daily: {}, mrr: null, lifetime: null } } }, now), { revenueCents: 0, mrrCents: null });
});
test("publishing refuses missing history, mixed-only currencies and invalid metrics", () => {
  const now = Date.now();
  assert.equal(listingSnapshot({ active: null, currencies: {} }, now), null);
  assert.equal(listingSnapshot({ active: null, currencies: { EUR: { daily: {}, mrr: 10, lifetime: 10 } } }, now), null);
  for (const usd of [ { daily: null, mrr: 10 }, { daily: { [isoDay(now)]: NaN }, mrr: 10 }, { daily: {}, mrr: Infinity }, { daily: {}, mrr: -1 }, { daily: { [isoDay(now)]: -100 }, mrr: 10 } ]) {
    assert.equal(listingSnapshot({ active: null, currencies: { USD: { lifetime: null, ...usd } } }, now), null);
  }
});

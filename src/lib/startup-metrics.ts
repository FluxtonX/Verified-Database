export type Provider = "stripe" | "revenuecat";
export const providerNames: Record<Provider, string> = { stripe: "Stripe", revenuecat: "RevenueCat" };

export type CurrencyMetrics = {
  lifetime: number | null;
  mrr: number | null;
  daily: Record<string, number> | null;
};

export type ProviderMetrics = {
  currencies: Record<string, CurrencyMetrics>;
  active: number | null;
};

export type PaymentSource = {
  id: string;
  provider: Provider;
  name: string;
  metrics: ProviderMetrics | null;
  synced_at: string | null;
};

export const dayMs = 86_400_000;
export const historyDays = 90;
export const isoDay = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

// Use only a newly fetched, single-provider USD snapshot when publishing.
// Missing daily history is different from a complete history with zero revenue.
export function listingSnapshot(metrics: ProviderMetrics, timestamp: number) {
  const usd = metrics.currencies.USD;
  if (!usd?.daily || !Number.isFinite(timestamp)) return null;
  const daily = Array.from({ length: 30 }, (_, index) => usd.daily?.[isoDay(timestamp - index * dayMs)] ?? 0);
  if (daily.some(amount => !Number.isFinite(amount))) return null;
  const revenue = daily.reduce((sum, amount) => sum + amount, 0);
  const cents = (amount: number) => Math.round(amount * 100);
  if (revenue < 0 || !Number.isSafeInteger(cents(revenue)) || (usd.mrr !== null &&
    (!Number.isFinite(usd.mrr) || usd.mrr < 0 || !Number.isSafeInteger(cents(usd.mrr))))) return null;
  return { revenueCents: cents(revenue), mrrCents: usd.mrr === null ? null : cents(usd.mrr) };
}

export function currencyAmount(value: number, currency: string, rounded = false) {
  const whole = rounded && (value === 0 || Math.abs(value) >= 1);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    ...(whole && { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  }).format(value);
}

export function sumAvailable(values: (number | null)[]) {
  return values.length && values.every(value => value !== null)
    ? values.reduce<number>((total, value) => total + (value ?? 0), 0)
    : null;
}

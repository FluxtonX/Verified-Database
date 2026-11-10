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

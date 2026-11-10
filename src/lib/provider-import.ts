import { revenueCatAppProfile, type RevenueCatApp } from "./revenuecat-app-profile";
import { readStripeProfile } from "./stripe-profile";
import { dayMs, historyDays, isoDay, type CurrencyMetrics, type ProviderMetrics } from "./startup-metrics";

type ImportedSource = {
  id: string;
  name: string;
  website: string | null;
  description: string;
  country: string | null;
  metrics: ProviderMetrics;
  appProfile?: Awaited<ReturnType<typeof revenueCatAppProfile>>["appProfile"];
};

async function getJson<T>(url: URL, key: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", redirect: "error", signal });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

type StripePage<T> = { data: T[]; has_more: boolean };
type StripeCharge = { id: string; created: number; currency: string; paid: boolean; disputed: boolean; amount_captured: number; amount_refunded: number };
type StripeItem = {
  quantity?: number;
  price: { currency: string; unit_amount_decimal: string | null; billing_scheme: string; recurring: { interval: "day" | "week" | "month" | "year"; interval_count: number; usage_type: string } | null };
};
type StripeSubscription = { id: string; items: StripePage<StripeItem>; discounts?: unknown[] };

async function stripePages<T extends { id: string }>(
  path: string, key: string, signal: AbortSignal, visit: (item: T) => void, params: Record<string, string> = {},
) {
  const url = new URL(path, "https://api.stripe.com");
  url.search = new URLSearchParams({ ...params, limit: "100" }).toString();
  for (let page = 0; page < 50; page++) {
    const { data, has_more: more } = await getJson<StripePage<T>>(url, key, signal);
    data.forEach(visit);
    if (!more) return true;
    const last = data.at(-1)?.id;
    if (!last) throw new Error("Invalid Stripe page");
    url.searchParams.set("starting_after", last);
  }
  return false;
}

function stripeMajor(amount: number, currency: string) {
  const zeroDecimal = ["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "VND", "VUV", "XAF", "XOF", "XPF"];
  const threeDecimal = ["BHD", "JOD", "KWD", "OMR", "TND"];
  const digits = zeroDecimal.includes(currency) ? 0 : threeDecimal.includes(currency) ? 3 : 2;
  return amount / 10 ** digits;
}

export async function importStripeSource(key: string): Promise<{ source?: ImportedSource; error?: string }> {
  const { profile, defaultCurrency, error } = await readStripeProfile(key);
  if (!profile) return { error };

  try {
    const signal = AbortSignal.timeout(35_000);
    const currencies: Record<string, CurrencyMetrics> = {};
    function currency(code: string) {
      return currencies[code] ??= { lifetime: 0, mrr: 0, daily: {} };
    }
    currency(defaultCurrency);
    const daysStart = isoDay(Date.now() - (historyDays - 1) * dayMs);
    let oldest = "";
    let active = 0;
    let mrrIncomplete = false;
    const [allCharges, allSubscriptions] = await Promise.all([
      stripePages<StripeCharge>("/v1/charges", key, signal, charge => {
        oldest = isoDay(charge.created * 1000);
        if (!charge.paid || charge.disputed || !charge.amount_captured) return;
        const code = charge.currency.toUpperCase();
        const value = stripeMajor(Math.max(0, charge.amount_captured - charge.amount_refunded), code);
        const metrics = currency(code);
        metrics.lifetime = (metrics.lifetime ?? 0) + value;
        if (oldest >= daysStart && metrics.daily) metrics.daily[oldest] = (metrics.daily[oldest] ?? 0) + value;
      }),
      stripePages<StripeSubscription>("/v1/subscriptions", key, signal, subscription => {
        active++;
        if (subscription.items.has_more || subscription.discounts?.length) mrrIncomplete = true;
        for (const { price, quantity } of subscription.items.data) {
          if (!price.recurring || price.recurring.usage_type === "metered") continue;
          if (price.billing_scheme !== "per_unit" || price.unit_amount_decimal === null) {
            mrrIncomplete = true;
            continue;
          }
          const { interval, interval_count } = price.recurring;
          const factor = { day: 365.25 / 12, week: 52 / 12, month: 1, year: 1 / 12 }[interval] / interval_count;
          const code = price.currency.toUpperCase();
          const metrics = currency(code);
          metrics.mrr = (metrics.mrr ?? 0) + stripeMajor(Number(price.unit_amount_decimal) * (quantity ?? 1) * factor, code);
        }
      }, { status: "active" }),
    ]);
    for (const metrics of Object.values(currencies)) {
      if (!allCharges) metrics.lifetime = null;
      if (!allCharges && oldest >= daysStart) metrics.daily = null;
      if (!allSubscriptions || mrrIncomplete) metrics.mrr = null;
    }
    return { source: {
      id: profile.stripe_account_id, name: profile.name, website: profile.website_url,
      description: profile.description, country: profile.country,
      metrics: { currencies, active: allSubscriptions ? active : null },
    } };
  } catch (error) {
    return { error: error instanceof Error && error.message === "403"
      ? "Enable read access to Charges and Subscriptions on your Stripe restricted key."
      : "Couldn’t read Stripe metrics. Check the key permissions and try again." };
  }
}

type RcProject = { id: string; name: string; icon_url?: string | null; icon_url_large?: string | null };
type RcOverview = { currency: string; metrics: { id: string; value: number }[] };
type RcChart = { resolution: string; yaxis_currency?: string; values: unknown[] };

function revenueCatDays(chart: RcChart, completeOnly = false) {
  if (chart.resolution !== "day" || chart.yaxis_currency?.toUpperCase() !== "USD") return null;
  const daily: Record<string, number> = {};
  for (const point of chart.values) {
    if (!point || typeof point !== "object") return null;
    const { cohort, timestamp, value, measure, incomplete } = Array.isArray(point) && point.length === 2
      ? { timestamp: point[0], value: point[1], cohort: undefined, measure: undefined, incomplete: undefined }
      : point as { cohort?: unknown; timestamp?: unknown; value?: unknown; measure?: unknown; incomplete?: boolean };
    if ((completeOnly && incomplete) || (measure !== undefined && measure !== 0)) continue;
    const time = timestamp ?? cohort;
    if (typeof time !== "number" || !Number.isFinite(time) || typeof value !== "number" || !Number.isFinite(value)) return null;
    const day = isoDay(time < 1e12 ? time * 1000 : time);
    if (day in daily) return null;
    daily[day] = value;
  }
  return chart.values.length && !Object.keys(daily).length ? null : daily;
}

export async function importRevenueCatSource(key: string, projectId: string): Promise<{ source?: ImportedSource; error?: string }> {
  if (!/^sk_(?!(?:live|test|org)_)[a-zA-Z0-9_-]{8,240}$/.test(key)) {
    return { error: "Enter a RevenueCat V2 secret key that starts with sk_." };
  }
  if (projectId && !/^proj[a-zA-Z0-9_-]{3,100}$/.test(projectId)) return { error: "Enter the RevenueCat project ID shown in project settings." };

  try {
    const signal = AbortSignal.timeout(25_000);
    const api = (path: string, params: Record<string, string> = {}) => {
      const url = new URL(`/v2/${path}`, "https://api.revenuecat.com");
      url.search = new URLSearchParams(params).toString();
      return url;
    };
    const projects = await getJson<{ items: RcProject[]; next_page?: string }>(api("projects", { limit: "100" }), key, signal);
    const project = projectId ? projects.items.find(item => item.id === projectId) : projects.items.length === 1 && !projects.next_page ? projects.items[0] : undefined;
    if (!project || !/^proj[a-zA-Z0-9_-]{3,100}$/.test(project.id)) return { error: "Enter the ID of a project accessible to this RevenueCat key." };

    const path = `projects/${project.id}`;
    const now = Date.now();
    const end = isoDay(now);
    const [overview, revenue, chart, mrrChart, appDetails] = await Promise.all([
      getJson<RcOverview>(api(`${path}/metrics/overview`, { currency: "USD" }), key, signal),
      getJson<{ value: number; currency: string }>(api(`${path}/metrics/revenue`, {
        start_date: "2008-07-01", end_date: end, currency: "USD",
      }), key, signal).catch(() => null),
      getJson<RcChart>(api(`${path}/charts/revenue`, {
        start_date: isoDay(now - (historyDays - 1) * dayMs), end_date: end, currency: "USD", resolution: "0",
      }), key, signal).then(data => revenueCatDays(data)).catch(() => null),
      getJson<RcChart>(api(`${path}/charts/mrr`, {
        start_date: isoDay(now - 7 * dayMs), end_date: end, currency: "USD", resolution: "0",
      }), key, signal).then(data => revenueCatDays(data, true)).catch(() => null),
      getJson<{ items: RevenueCatApp[]; next_page?: string }>(api(`${path}/apps`, { limit: "100" }), key, signal)
        .then(data => data.next_page ? [] : data.items).catch(() => []),
    ]);

    const metric = (id: string) => {
      const value = overview.metrics.find(item => item.id === id)?.value;
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    };
    const overviewMrr = overview.currency === "USD" ? metric("mrr") : null;
    const active = metric("active_subscriptions");
    const yesterday = isoDay(now - dayMs);
    const mrrDay = mrrChart && Object.keys(mrrChart).filter(day => day >= yesterday && day <= end).sort().at(-1);
    const mrr = mrrChart && mrrDay && active !== 0 ? mrrChart[mrrDay] : overviewMrr;
    const app = await revenueCatAppProfile(appDetails, project.icon_url_large ?? project.icon_url);
    return { source: {
      id: project.id, name: project.name.trim().slice(0, 100) || "RevenueCat project", country: null,
      ...app,
      metrics: {
        currencies: { USD: {
          lifetime: revenue?.currency === "USD" && Number.isFinite(revenue.value) ? revenue.value : null,
          mrr,
          daily: chart,
        } },
        active,
      },
    } };
  } catch (error) {
    return { error: error instanceof Error && error.message === "403"
      ? "Enable read access to Projects and Overview Metrics on your RevenueCat key."
      : "Couldn’t read RevenueCat. Check your V2 key and project permissions." };
  }
}

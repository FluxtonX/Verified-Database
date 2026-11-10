"use client";

import { useId, useState } from "react";
import { currencyAmount, dayMs, historyDays, isoDay, providerNames, sumAvailable, type PaymentSource } from "@/lib/startup-metrics";

const rangeOptions = [30, 60, 90];

function Metric({ label, value, note, exact }: { label: string; value: string; note?: string; exact?: string }) {
  return <div className="profile-stat"><dt>{label}</dt><dd title={exact}>{value}</dd>{note && <small>{note}</small>}</div>;
}

export default function StartupRevenue({ sources, founder, founded, country, margin }: {
  sources: PaymentSource[];
  founder: string | null;
  founded: string;
  country: string;
  margin: number | null;
}) {
  const gradient = useId();
  const firstSource = sources.find(source => source.metrics) ?? sources[0];
  const [selection, setSelection] = useState(firstSource?.id ?? "");
  const [combine, setCombine] = useState(false);
  const [currencyChoice, setCurrencyChoice] = useState("");
  const [days, setDays] = useState(30);
  const [compare, setCompare] = useState(false);
  const selected = selection === "combined" && combine
    ? sources
    : sources.filter(source => source.id === (selection || sources[0]?.id));
  const currencies = [...new Set(selected.flatMap(source => Object.keys(source.metrics?.currencies ?? {})))]
    .filter(code => /^[A-Z]{3}$/.test(code)).sort();
  const currency = currencies.includes(currencyChoice) ? currencyChoice : currencies.includes("USD") ? "USD" : currencies[0] ?? "USD";
  const totals = selected.map(source => source.metrics?.currencies?.[currency] ?? null);
  const timestamps = selected.map(source => source.synced_at ? Date.parse(source.synced_at) : NaN);
  const end = timestamps.length && timestamps.every(Number.isFinite) ? Math.min(...timestamps) : null;
  const sharedDays = end === null ? 0 : historyDays - (
    Date.parse(isoDay(Math.max(...timestamps))) - Date.parse(isoDay(end))
  ) / dayMs;
  const dailyAvailable = totals.length > 0 && totals.every(metrics => metrics?.daily != null);
  const lifetime = sumAvailable(totals.map(metrics => metrics?.lifetime ?? null));
  const mrr = sumAvailable(totals.map(metrics => metrics?.mrr ?? null));
  const active = sumAvailable(selected.map(source => source.metrics?.active ?? null));
  const series = (periodOffset: number) => end === null || !dailyAvailable || days + periodOffset > sharedDays ? [] : Array.from({ length: days }, (_, index) => {
    const date = isoDay(end - (days - 1 - index + periodOffset) * dayMs);
    const value = totals.reduce((total, metrics) => total + (metrics?.daily?.[date] ?? 0), 0);
    return { date, value };
  });
  const data = series(0);
  const previous = compare && days === 30 ? series(30) : [];
  const amount = (value: number | null) => value === null ? "—" : currencyAmount(value, currency, true);
  const exact = (value: number | null) => value === null ? undefined : currencyAmount(value, currency);
  const total = data.length ? data.reduce((sum, point) => sum + point.value, 0) : null;
  const max = Math.max(1, ...data.map(point => point.value), ...previous.map(point => point.value));
  const min = Math.min(0, ...data.map(point => point.value), ...previous.map(point => point.value));
  const y = (value: number) => 16 + (max - value) * 232 / (max - min);
  const x = (index: number) => 72 + index * 712 / (days - 1);
  const points = (values: typeof data) => values.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const ticks = Array.from({ length: 5 }, (_, index) => max - (max - min) * index / 4);

  return (
    <>
      <dl className="profile-stats">
        <Metric label="All-time revenue" value={amount(lifetime)} exact={exact(lifetime)} note="All-time" />
        <Metric label="MRR" value={amount(mrr)} exact={exact(mrr)} note={active === null ? undefined : `${active.toLocaleString("en-US")} active subscription${active === 1 ? "" : "s"}`} />
        <Metric label="Founder" value={founder ? `@${founder}` : "—"} />
        <Metric label="Founded" value={founded} note={country || undefined} />
      </dl>
      <section className="profile-chart" aria-label="Revenue history">
        <div className="profile-chart-header">
          <div className="profile-chart-total"><strong title={exact(total)}>{amount(total)}</strong>{margin !== null && <small>{margin}% profit margin</small>}</div>
          <div className="profile-chart-controls">
            {sources.length > 1 && <select aria-label="Payment source" value={selection || sources[0]?.id}
              onChange={event => setSelection(event.target.value)}>
              {sources.map(source => <option key={source.id} value={source.id}>{providerNames[source.provider]} · {source.name}</option>)}
              {combine && <option value="combined">Combined sources</option>}
            </select>}
            {currencies.length > 1 && <select aria-label="Currency" value={currency} onChange={event => setCurrencyChoice(event.target.value)}>
              {currencies.map(code => <option key={code}>{code}</option>)}
            </select>}
            <select aria-label="Date range" value={days} onChange={event => setDays(Number(event.target.value))}>
              {rangeOptions.map(range => <option key={range} value={range}>Last {range} days</option>)}
            </select>
          </div>
        </div>
        {data.length ? <svg className="profile-chart-plot" viewBox="0 0 800 288" role="img" aria-label={`Daily revenue in ${currency} over ${days} days, totaling ${amount(total)}`}>
          <defs><linearGradient id={gradient} x2="0" y2="1"><stop stopColor="#6168ff" stopOpacity=".35" /><stop offset="1" stopColor="#6168ff" stopOpacity=".02" /></linearGradient></defs>
          {ticks.map(value => <g key={value}>
            <line x1="72" x2="784" y1={y(value)} y2={y(value)} stroke="#ebebeb" />
            <text x="64" y={y(value) + 4} textAnchor="end">{amount(value)}</text>
          </g>)}
          <polygon points={`72,${y(0)} ${points(data)} 784,${y(0)}`} fill={`url(#${gradient})`} />
          {previous.length > 0 && <polyline points={points(previous)} fill="none" stroke="#9b9bad" strokeWidth="2" strokeDasharray="4 4" />}
          <polyline points={points(data)} fill="none" stroke="#5c65ff" strokeWidth="2" strokeLinejoin="round" />
          {[0, .25, .5, .75, 1].map(fraction => {
            const index = Math.round((days - 1) * fraction);
            const date = new Date(`${data[index].date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
            return <text key={index} x={x(index)} y="272" textAnchor={fraction === 1 ? "end" : "middle"}>{date}</text>;
          })}
        </svg> : <p className="profile-chart-empty">{sources.length ? "Daily revenue isn’t available for this selection. Refresh the provider from your dashboard." : "Connect a payment provider to see revenue history."}</p>}
        <div className="profile-chart-footer">
          {data.length > 0 && days === 30 && sharedDays >= 60 && <label><input type="checkbox" checked={compare} onChange={event => setCompare(event.target.checked)} /> Compare previous period</label>}
          {sources.length > 1 && <label><input type="checkbox" checked={combine} onChange={event => {
            setCombine(event.target.checked);
            setSelection(event.target.checked ? "combined" : firstSource.id);
          }} /> Combine sources with distinct transactions</label>}
          {selection === "combined" && <small>Only matching currencies are combined. A combined metric is unavailable when a source has no value for that currency.</small>}
        </div>
      </section>
      {sources.length > 0 && <p className="profile-source-note">
        {selected.map(source => providerNames[source.provider]).join(" · ")}
        {end === null ? " · Metrics pending" : ` · Latest shared chart date ${isoDay(end)} UTC`}
      </p>}
    </>
  );
}

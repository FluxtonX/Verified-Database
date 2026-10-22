import { REVENUE_TYPES, formatMoney, totalRevenue, type Startup } from "@/data/startups";

export default function RevenueBar({ startup, tall = false }: { startup: Startup; tall?: boolean }) {
  const total = totalRevenue(startup);
  return (
    <div className={`rbar ${tall ? "rbar-tall" : ""}`} role="img" aria-label="Revenue split by type">
      {REVENUE_TYPES.filter((t) => startup.revenue[t.id]).map((t) => {
        const v = startup.revenue[t.id] ?? 0;
        return (
          <span
            key={t.id}
            className="rbar-seg"
            style={{ width: `${(v / total) * 100}%`, background: t.color }}
            title={`${t.label}: ${formatMoney(v)} (${Math.round((v / total) * 100)}%)`}
          />
        );
      })}
    </div>
  );
}

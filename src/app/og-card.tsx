import type { ReactNode } from "react";

/** Shared layout for generated social preview images (1200×630). Plain inline styles: ImageResponse supports flexbox only. */
export function OgCard({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#121212", color: "#fff", fontFamily: "sans-serif" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: "#b7f36b", display: "flex", alignItems: "center", justifyContent: "center", color: "#121212", fontSize: 28, fontWeight: 800 }}>↗</div>
      <div style={{ fontSize: 30, fontWeight: 700 }}>VerifedDB</div>
      <div style={{ marginLeft: "auto", fontSize: 22, color: "#b7f36b", textTransform: "uppercase", letterSpacing: 3 }}>{eyebrow}</div>
    </div>
    <div style={{ display: "flex", fontSize: title.length > 40 ? 64 : 80, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1040 }}>{title}</div>
    <div style={{ display: "flex", gap: 24 }}>{children}</div>
  </div>;
}

export function OgStat({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "flex", flexDirection: "column", padding: "20px 28px", borderRadius: 20, background: "#1f1f1f", border: "1px solid #333" }}>
    <div style={{ fontSize: 22, color: "#a5a197" }}>{label}</div>
    <div style={{ fontSize: 44, fontWeight: 700, color: "#b7f36b" }}>{value}</div>
  </div>;
}

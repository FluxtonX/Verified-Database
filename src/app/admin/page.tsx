"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { formatMoney, totalRevenue } from "@/data/startups";
import {
  useStored,
  MY_STARTUPS_KEY,
  OFFERS_KEY,
  DEFAULT_MY_STARTUPS,
  DEFAULT_OFFERS,
  type UserStartup,
  type Offer,
} from "@/lib/storage";
import { LISTINGS } from "@/data/listings";

interface VerificationItem {
  id: string;
  startupName: string;
  category: string;
  founderEmail: string;
  claimedRevenue: number;
  stripeKeyHint: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

const INITIAL_VERIFICATIONS: VerificationItem[] = [
  {
    id: "ver-1",
    startupName: "PixelPress",
    category: "AI",
    founderEmail: "marco@pixelpress.io",
    claimedRevenue: 0.38,
    stripeKeyHint: "rk_live_...481e",
    status: "approved",
    submittedAt: "2 days ago",
  },
  {
    id: "ver-2",
    startupName: "DevPulse CI",
    category: "Developer tools",
    founderEmail: "devon@devpulse.run",
    claimedRevenue: 0.28,
    stripeKeyHint: "rk_live_...91b0",
    status: "pending",
    submittedAt: "4 hours ago",
  },
  {
    id: "ver-3",
    startupName: "LegalDoc AI",
    category: "AI",
    founderEmail: "alex@legaldoc.co",
    claimedRevenue: 0.45,
    stripeKeyHint: "rk_live_...12fa",
    status: "pending",
    submittedAt: "1 day ago",
  },
];

export default function AdminPage() {
  const [startups, setStartups] = useStored<UserStartup>(MY_STARTUPS_KEY, DEFAULT_MY_STARTUPS);
  const [offers] = useStored<Offer>(OFFERS_KEY, DEFAULT_OFFERS);
  const [verifications, setVerifications] = useState<VerificationItem[]>(INITIAL_VERIFICATIONS);

  const [activeTab, setActiveTab] = useState<"queue" | "listings" | "audit">("queue");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerifications() {
      try {
        const res = await fetch("/api/admin/verifications");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.verifications) && data.verifications.length > 0) {
            setVerifications((prev) => {
              const existingIds = new Set(prev.map((v) => v.id));
              const fetched = data.verifications.filter((v: any) => !existingIds.has(v.id));
              return [...fetched, ...prev];
            });
          }
        }
      } catch (err) {
        console.warn("Using offline verifications cache:", err);
      }
    }
    loadVerifications();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleVerifyAction = async (id: string, action: "approved" | "rejected") => {
    // 1. Optimistic state updates
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: action } : v))
    );
    setStartups((prev) =>
      prev.map((s) =>
        s.id === id || s.name.toLowerCase() === id.toLowerCase()
          ? {
              ...s,
              verified: action === "approved",
              verificationStatus: action === "approved" ? "verified" : "rejected",
            }
          : s
      )
    );

    // 2. Sync with SQLite backend
    try {
      await fetch("/api/admin/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId: id, action }),
      });
    } catch (err) {
      console.warn("Backend update failed, kept in local state:", err);
    }

    showToast(`Verification ${action === "approved" ? "Approved ✓" : "Rejected"} for listing!`);
  };

  const pendingCount = verifications.filter((v) => v.status === "pending").length;

  return (
    <>
      <SiteHeader />
      <main className="detail wrap">
        {toastMsg && (
          <div
            style={{
              position: "fixed",
              bottom: "2rem",
              right: "2rem",
              zIndex: 9999,
              background: "var(--ink)",
              color: "var(--on-ink)",
              padding: "0.85rem 1.4rem",
              borderRadius: "12px",
              boxShadow: "var(--shadow-lg)",
              border: "2px solid var(--brand)",
              fontWeight: 600,
            }}
          >
            🛡️ {toastMsg}
          </div>
        )}

        <div className="dash-hero">
          <div>
            <span className="eyebrow" style={{ color: "#e03e5a", borderColor: "#f9a8b8" }}>
              Admin Control Center
            </span>
            <h1>TrustLedger Administration</h1>
            <p className="sub">
              Review incoming Stripe verification requests, moderate active listings, and audit platform security.
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-dark">
            ← Switch to Founder View
          </Link>
        </div>

        {/* Admin KPI Stats */}
        <div className="dash-kpi-grid">
          <div className="dash-kpi-card">
            <span className="dk-num" style={{ color: "#e03e5a" }}>
              {pendingCount}
            </span>
            <span className="dk-lbl">Pending Verifications</span>
          </div>

          <div className="dash-kpi-card">
            <span className="dk-num">
              {LISTINGS.length + startups.length}
            </span>
            <span className="dk-lbl">Total Active Startups</span>
          </div>

          <div className="dash-kpi-card">
            <span className="dk-num" style={{ color: "#12b886" }}>
              {offers.length}
            </span>
            <span className="dk-lbl">Buyer Offers Recorded</span>
          </div>

          <div className="dash-kpi-card">
            <span className="dk-num" style={{ color: "var(--brand)" }}>
              $14.2M
            </span>
            <span className="dk-lbl">Verified Pipeline</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="dash-tabs-bar">
          <button
            className={`dash-tab-btn ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => setActiveTab("queue")}
          >
            ⏳ Verification Queue ({pendingCount})
          </button>
          <button
            className={`dash-tab-btn ${activeTab === "listings" ? "active" : ""}`}
            onClick={() => setActiveTab("listings")}
          >
            📋 Manage All Listings ({LISTINGS.length + startups.length})
          </button>
          <button
            className={`dash-tab-btn ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            🔒 Security & API Audit
          </button>
        </div>

        {/* TAB 1: VERIFICATION QUEUE */}
        {activeTab === "queue" && (
          <div className="dash-tab-content">
            <div className="panel" style={{ marginBottom: "1.5rem" }}>
              <h3>Stripe Restricted Key Ingestion Flow</h3>
              <p className="sub">
                Restricted keys provide read-only scope for charges, invoices, and subscription balances. Approving connects the scheduled telemetry sync worker.
              </p>
            </div>

            <div className="offers-table-wrapper">
              <table className="offers-table">
                <thead>
                  <tr>
                    <th>Startup</th>
                    <th>Stated Revenue</th>
                    <th>Restricted Key Scope</th>
                    <th>Founder Contact</th>
                    <th>Status</th>
                    <th>Audit Action</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <strong>{v.startupName}</strong>
                        <small style={{ display: "block", color: "var(--muted)" }}>{v.category}</small>
                      </td>
                      <td className="amount-col">{formatMoney(v.claimedRevenue)}/yr</td>
                      <td>
                        <span className="code-hint">{v.stripeKeyHint}</span>
                        <small style={{ display: "block", color: "#12b886", fontSize: "0.75rem" }}>
                          ✓ Read-only charges & subs
                        </small>
                      </td>
                      <td>{v.founderEmail}</td>
                      <td>
                        <span className={`st ${v.status === "approved" ? "accepted" : v.status === "rejected" ? "declined" : "pending"}`}>
                          {v.status}
                        </span>
                      </td>
                      <td>
                        {v.status === "pending" ? (
                          <div className="btn-actions-group">
                            <button
                              className="btn-action-accept"
                              onClick={() => handleVerifyAction(v.id, "approved")}
                            >
                              Approve ✓
                            </button>
                            <button
                              className="btn-action-decline"
                              onClick={() => handleVerifyAction(v.id, "rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="action-done">Audited</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE ALL LISTINGS */}
        {activeTab === "listings" && (
          <div className="dash-tab-content">
            <div className="panel" style={{ marginBottom: "1.5rem" }}>
              <h3>All Marketplace & Directory Listings</h3>
              <p className="sub">Platform inventory currently visible to buyers and visitors.</p>
            </div>

            <div className="lgrid">
              {[...startups, ...LISTINGS].map((item) => (
                <div key={item.id} className="lcard">
                  <div className="lc-top">
                    <span className="logo-badge">{item.logo}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.category}</small>
                    </div>
                    <span className={`vbadge ${item.verified ? "ok" : "self"}`}>
                      {item.verified ? "✓ Verified" : "Self-reported"}
                    </span>
                  </div>

                  <p className="lc-tag">{item.tagline}</p>

                  <dl className="lc-stats">
                    <div>
                      <dt>Annual Rev</dt>
                      <dd>{formatMoney(totalRevenue(item as any))}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{(item as any).isForSale || (item as any).askingPrice ? "For Sale" : "Showcase"}</dd>
                    </div>
                  </dl>

                  <div className="dash-card-actions">
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>ID: {item.id}</span>
                    <button
                      className="btn-text-sm"
                      onClick={() => showToast(`Listing ${item.name} marked as Featured on Homepage!`)}
                    >
                      Feature on Home ★
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY AUDIT */}
        {activeTab === "audit" && (
          <div className="dash-tab-content">
            <div className="panel">
              <h2>Data Privacy & API Integrity Guardrails</h2>
              <p className="sub">
                How TrustLedger guarantees zero customer data leakage and bank-grade isolation.
              </p>

              <div className="audit-points-grid" style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                <div className="audit-point-card" style={{ padding: "1.2rem", background: "var(--surface-2)", borderRadius: "14px", border: "2px solid var(--line)" }}>
                  <strong style={{ display: "block", marginBottom: "0.3rem", color: "#12b886" }}>
                    ✓ 1. Zero Personally Identifiable Information (PII) Stored
                  </strong>
                  <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.92rem" }}>
                    When syncing with Stripe, invoice and charge customer names, physical addresses, emails, and credit card numbers are stripped in-memory before calculation. Only aggregate MRR and volume totals are written to the database.
                  </p>
                </div>

                <div className="audit-point-card" style={{ padding: "1.2rem", background: "var(--surface-2)", borderRadius: "14px", border: "2px solid var(--line)" }}>
                  <strong style={{ display: "block", marginBottom: "0.3rem", color: "#12b886" }}>
                    ✓ 2. Restricted Read-Only Key Scopes
                  </strong>
                  <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.92rem" }}>
                    Keys must follow the <code style={{ background: "var(--alt)", padding: "0.15rem 0.4rem", borderRadius: "6px" }}>rk_live_...</code> format with permissions strictly restricted to <code style={{ background: "var(--alt)", padding: "0.15rem 0.4rem", borderRadius: "6px" }}>Invoices: Read</code> and <code style={{ background: "var(--alt)", padding: "0.15rem 0.4rem", borderRadius: "6px" }}>Subscriptions: Read</code>.
                  </p>
                </div>

                <div className="audit-point-card" style={{ padding: "1.2rem", background: "var(--surface-2)", borderRadius: "14px", border: "2px solid var(--line)" }}>
                  <strong style={{ display: "block", marginBottom: "0.3rem", color: "var(--brand)" }}>
                    ✓ 3. Escrow Handover Protocol
                  </strong>
                  <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.92rem" }}>
                    Buyer funds are held in milestone custody until domain ownership, Stripe Connect customer database migration, and source code assets have been transferred and acknowledged.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

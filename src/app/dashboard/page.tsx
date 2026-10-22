"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RevenueBar from "@/components/RevenueBar";
import { formatMoney, totalRevenue } from "@/data/startups";
import {
  useStored,
  MY_STARTUPS_KEY,
  OFFERS_KEY,
  SAVED_KEY,
  DEFAULT_MY_STARTUPS,
  DEFAULT_OFFERS,
  type UserStartup,
  type Offer,
} from "@/lib/storage";
import { LISTINGS } from "@/data/listings";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function DashboardPage() {
  const [startups, setStartups] = useStored<UserStartup>(MY_STARTUPS_KEY, DEFAULT_MY_STARTUPS);
  const [allOffers, setAllOffers] = useStored<Offer>(OFFERS_KEY, DEFAULT_OFFERS);
  const [savedIds, setSavedIds] = useStored<string>(SAVED_KEY);

  const [activeTab, setActiveTab] = useState<"startups" | "received" | "sent" | "saved">("startups");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sync with real backend SQLite API on mount
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [startupsRes, offersRes] = await Promise.all([
          fetch("/api/startups"),
          fetch("/api/offers"),
        ]);

        if (startupsRes.ok) {
          const { startups: serverStartups } = await startupsRes.json();
          // Filter to user-created startups (ones starting with usr-)
          const userOnly = serverStartups.filter((s: any) => s.id.startsWith("usr-"));
          if (userOnly.length > 0) {
            setStartups(userOnly);
          }
        }

        if (offersRes.ok) {
          const { offers: serverOffers } = await offersRes.json();
          if (serverOffers && serverOffers.length > 0) {
            setAllOffers(serverOffers);
          }
        }
      } catch (e) {
        console.warn("Operating with local storage state:", e);
      }
    }
    loadBackendData();
  }, []);

  // Filter offers received vs sent
  const offersReceived = allOffers.filter((o) => o.isReceived || startups.some((s) => s.id === o.listingId));
  const offersSent = allOffers.filter((o) => !o.isReceived && !startups.some((s) => s.id === o.listingId));

  // Saved listings from public marketplace
  const savedListings = LISTINGS.filter((l) => savedIds.includes(l.id));

  const updateOfferStatus = async (offerId: string, newStatus: "accepted" | "declined") => {
    const updated = allOffers.map((o) => (o.id === offerId ? { ...o, status: newStatus } : o));
    setAllOffers(updated);
    showToast(`Offer marked as ${newStatus}! Buyer will be notified.`);

    try {
      await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      console.warn("Failed to patch offer on server:", e);
    }
  };

  const toggleStartupForSale = async (id: string) => {
    const target = startups.find((s) => s.id === id);
    const nextStatus = target ? !target.isForSale : false;
    const updated = startups.map((s) => (s.id === id ? { ...s, isForSale: nextStatus } : s));
    setStartups(updated);
    showToast("Listing status updated!");

    try {
      await fetch(`/api/startups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isForSale: nextStatus }),
      });
    } catch (e) {
      console.warn("Failed to patch startup on server:", e);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="detail wrap">
        {toastMsg && (
          <div
            className="toast-alert"
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
            ✅ {toastMsg}
          </div>
        )}

        <div className="dash-hero">
          <div>
            <span className="eyebrow">Founder Workspace</span>
            <h1>Dashboard</h1>
            <p className="sub">Manage your listed startups, review acquisition offers, and track deals in progress.</p>
          </div>
          <Link href="/list" className="btn btn-brand">
            + List Another Startup
          </Link>
        </div>

        {/* KPI Counter Cards */}
        <div className="dash-kpi-grid">
          <div className="dash-kpi-card" onClick={() => setActiveTab("startups")}>
            <span className="dk-num">{startups.length}</span>
            <span className="dk-lbl">My Startups</span>
          </div>

          <div className="dash-kpi-card" onClick={() => setActiveTab("received")}>
            <span className="dk-num" style={{ color: "#12b886" }}>
              {offersReceived.length}
            </span>
            <span className="dk-lbl">Offers Received</span>
          </div>

          <div className="dash-kpi-card" onClick={() => setActiveTab("sent")}>
            <span className="dk-num" style={{ color: "var(--brand)" }}>
              {offersSent.length}
            </span>
            <span className="dk-lbl">Offers Sent</span>
          </div>

          <div className="dash-kpi-card" onClick={() => setActiveTab("saved")}>
            <span className="dk-num">{savedListings.length}</span>
            <span className="dk-lbl">Saved Watchlist</span>
          </div>
        </div>

        {/* Dashboard Tabs Navigation */}
        <div className="dash-tabs-bar">
          <button
            className={`dash-tab-btn ${activeTab === "startups" ? "active" : ""}`}
            onClick={() => setActiveTab("startups")}
          >
            💼 My Startups ({startups.length})
          </button>
          <button
            className={`dash-tab-btn ${activeTab === "received" ? "active" : ""}`}
            onClick={() => setActiveTab("received")}
          >
            📬 Offers Received ({offersReceived.length})
          </button>
          <button
            className={`dash-tab-btn ${activeTab === "sent" ? "active" : ""}`}
            onClick={() => setActiveTab("sent")}
          >
            📤 Offers Sent ({offersSent.length})
          </button>
          <button
            className={`dash-tab-btn ${activeTab === "saved" ? "active" : ""}`}
            onClick={() => setActiveTab("saved")}
          >
            ♥ Saved Watchlist ({savedListings.length})
          </button>
        </div>

        {/* TAB 1: MY STARTUPS */}
        {activeTab === "startups" && (
          <div className="dash-tab-content">
            {startups.length === 0 ? (
              <div className="empty">
                You haven't listed any startups yet.{" "}
                <Link href="/list" className="link">
                  List your first startup now
                </Link>
                .
              </div>
            ) : (
              <div className="lgrid">
                {startups.map((s) => {
                  const revTotal = totalRevenue(s as any);
                  return (
                    <div key={s.id} className="lcard">
                      <div className="lc-top">
                        <span className="logo-badge">{s.logo}</span>
                        <div>
                          <strong>{s.name}</strong>
                          <small>{s.category} · Founded {s.founded}</small>
                        </div>
                        <span className={`vbadge ${s.verified ? "ok" : "self"}`}>
                          {s.verified ? "✓ Verified" : "Self-reported"}
                        </span>
                      </div>

                      <p className="lc-tag">{s.tagline}</p>

                      <div className="lc-price">
                        <span>Status</span>
                        <strong>{s.isForSale ? `For Sale (${formatMoney(s.askingPrice || 0)})` : "Showcase Only"}</strong>
                      </div>

                      <dl className="lc-stats">
                        <div>
                          <dt>Revenue / yr</dt>
                          <dd>{formatMoney(revTotal)}</dd>
                        </div>
                        {s.isForSale ? (
                          <>
                            <div>
                              <dt>Profit / yr</dt>
                              <dd>{formatMoney(s.profit || 0)}</dd>
                            </div>
                            <div>
                              <dt>Multiple</dt>
                              <dd>{s.profit ? `${((s.askingPrice || 0) / s.profit).toFixed(1)}x` : "—"}</dd>
                            </div>
                            <div>
                              <dt>Margin</dt>
                              <dd>{s.profit && revTotal ? `${Math.round(((s.profit || 0) / revTotal) * 100)}%` : "—"}</dd>
                            </div>
                          </>
                        ) : (
                          <div>
                            <dt>Listing Mode</dt>
                            <dd>Public Directory</dd>
                          </div>
                        )}
                      </dl>

                      <RevenueBar startup={s as any} />

                      <div className="dash-card-actions">
                        <button
                          type="button"
                          className="btn-text-sm"
                          onClick={() => toggleStartupForSale(s.id)}
                        >
                          {s.isForSale ? "Pause Listing" : "Put Up For Sale"}
                        </button>
                        <Link href={`/marketplace`} className="btn-text-sm" style={{ color: "var(--brand)" }}>
                          View Marketplace →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OFFERS RECEIVED */}
        {activeTab === "received" && (
          <div className="dash-tab-content">
            {offersReceived.length === 0 ? (
              <div className="empty">
                No buyer offers received yet. Make sure your startup is marked "For Sale" to attract verified buyers.
              </div>
            ) : (
              <div className="offers-table-wrapper">
                <table className="offers-table">
                  <thead>
                    <tr>
                      <th>Startup</th>
                      <th>Offered Amount</th>
                      <th>Buyer Email</th>
                      <th>Message</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offersReceived.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.listingName}</strong>
                        </td>
                        <td className="amount-col">{usd(o.amount)}</td>
                        <td>
                          <span className="email-badge">{o.email}</span>
                        </td>
                        <td className="msg-col">
                          <p title={o.message}>{o.message || "No message included."}</p>
                        </td>
                        <td>
                          <span className={`st ${o.status}`}>{o.status}</span>
                        </td>
                        <td className="actions-col">
                          {o.status === "pending" ? (
                            <div className="btn-actions-group">
                              <button
                                className="btn-action-accept"
                                onClick={() => updateOfferStatus(o.id, "accepted")}
                              >
                                Accept
                              </button>
                              <button
                                className="btn-action-decline"
                                onClick={() => updateOfferStatus(o.id, "declined")}
                              >
                                Decline
                              </button>
                            </div>
                          ) : o.status === "accepted" ? (
                            <Link href={`/deals/${o.id}`} className="btn-action-deal">
                              Closing Room 🤝
                            </Link>
                          ) : (
                            <span className="action-done">Declined</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OFFERS SENT */}
        {activeTab === "sent" && (
          <div className="dash-tab-content">
            {offersSent.length === 0 ? (
              <div className="empty">
                You haven't made any offers yet.{" "}
                <Link href="/marketplace" className="link">
                  Browse startups for sale
                </Link>{" "}
                to find opportunities.
              </div>
            ) : (
              <div className="offers-table-wrapper">
                <table className="offers-table">
                  <thead>
                    <tr>
                      <th>Startup</th>
                      <th>Your Offer</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offersSent.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/marketplace/${o.listingId}`} className="link">
                            <strong>{o.listingName}</strong>
                          </Link>
                        </td>
                        <td className="amount-col">{usd(o.amount)}</td>
                        <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className={`st ${o.status}`}>{o.status}</span>
                        </td>
                        <td>
                          {o.status === "accepted" ? (
                            <Link href={`/deals/${o.id}`} className="btn-action-deal">
                              Closing Room 🤝
                            </Link>
                          ) : (
                            <Link href={`/marketplace/${o.listingId}`} className="btn-text-sm">
                              Inspect Listing →
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SAVED WATCHLIST */}
        {activeTab === "saved" && (
          <div className="dash-tab-content">
            {savedListings.length === 0 ? (
              <div className="empty">
                No saved startups in your watchlist. Click "Save for later" on any startup listing to bookmark it here.
              </div>
            ) : (
              <div className="lgrid">
                {savedListings.map((l) => (
                  <Link key={l.id} href={`/marketplace/${l.id}`} className="lcard">
                    <div className="lc-top">
                      <span className="logo-badge">{l.logo}</span>
                      <div>
                        <strong>{l.name}</strong>
                        <small>{l.category}</small>
                      </div>
                      <span className={`vbadge ${l.verified ? "ok" : "self"}`}>
                        {l.verified ? "✓ Verified" : "Self-reported"}
                      </span>
                    </div>

                    <p className="lc-tag">{l.tagline}</p>

                    <div className="lc-price">
                      <span>Asking price</span>
                      <strong>{formatMoney(l.askingPrice)}</strong>
                    </div>

                    <dl className="lc-stats">
                      <div>
                        <dt>Revenue / yr</dt>
                        <dd>{formatMoney(totalRevenue(l))}</dd>
                      </div>
                      <div>
                        <dt>Profit / yr</dt>
                        <dd>{formatMoney(l.profit)}</dd>
                      </div>
                    </dl>

                    <span className="lc-foot">
                      View details & Make offer →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

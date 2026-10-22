"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { formatMoney } from "@/data/startups";
import {
  useStored,
  DEALS_KEY,
  OFFERS_KEY,
  DEFAULT_OFFERS,
  createInitialDeal,
  type Deal,
  type DealCheckpoint,
  type Offer,
} from "@/lib/storage";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STAGES = [
  { step: 1, title: "1. Agreement", desc: "Terms & APA signed" },
  { step: 2, title: "2. Escrow Funded", desc: "100% funds secured" },
  { step: 3, title: "3. Asset Transfer", desc: "Code, Domain & Stripe" },
  { step: 4, title: "4. Inspection", desc: "7-day technical verification" },
  { step: 5, title: "5. Closed", desc: "Escrow funds paid out" },
];

export default function DealClosingRoomPage({ params }: PageProps) {
  const { id } = use(params);

  const [storedDeals, setStoredDeals] = useStored<Deal>(DEALS_KEY, []);
  const [offers] = useStored<Offer>(OFFERS_KEY, DEFAULT_OFFERS);

  const [deal, setDeal] = useState<Deal | null>(null);
  const [role, setRole] = useState<"founder" | "buyer">("founder");
  const [newMsg, setNewMsg] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showApaModal, setShowApaModal] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Find or initialize deal from SQLite API or client storage
  useEffect(() => {
    async function loadDeal() {
      try {
        const res = await fetch(`/api/deals/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.deal) {
            setDeal(data.deal);
            return;
          }
        }
      } catch (e) {
        console.warn("API fetch failed, falling back to local store:", e);
      }

      // Fallback: search storedDeals or matching offer
      const found = storedDeals.find((d) => d.offerId === id || d.id === id);
      if (found) {
        setDeal(found);
      } else {
        const matchingOffer = offers.find((o) => o.id === id);
        if (matchingOffer) {
          const init = createInitialDeal(matchingOffer);
          setDeal(init);
          setStoredDeals([init, ...storedDeals]);
        } else {
          // Fallback generic deal for demo preview
          const fallbackOffer: Offer = {
            id,
            listingId: "pixelpress",
            listingName: "PixelPress",
            amount: 850000,
            email: "david@acquisitions-syndicate.com",
            message: "Standard escrow terms ready to close.",
            createdAt: new Date().toISOString(),
            status: "accepted",
          };
          const init = createInitialDeal(fallbackOffer);
          setDeal(init);
        }
      }
    }

    loadDeal();
  }, [id, storedDeals, offers, setStoredDeals]);

  if (!deal) {
    return (
      <>
        <SiteHeader />
        <main className="detail wrap">
          <div className="empty" style={{ padding: "4rem 0" }}>
            Loading secure Closing Room...
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const toggleCheckpoint = async (chkId: string) => {
    const updated = deal.checkpoints.map((c) => {
      if (c.id === chkId) {
        const nextDone = !c.done;
        return {
          ...c,
          done: nextDone,
          completedAt: nextDone ? `Verified by ${role === "founder" ? "Founder" : "Buyer"}` : undefined,
        };
      }
      return c;
    });

    // Auto-advance stage if inspection or transfer is finished
    const domainDone = updated.find((c) => c.id === "domain_transfer")?.done;
    const codeDone = updated.find((c) => c.id === "code_transfer")?.done;
    const stripeDone = updated.find((c) => c.id === "stripe_transfer")?.done;
    const inspectDone = updated.find((c) => c.id === "inspection")?.done;
    const releaseDone = updated.find((c) => c.id === "escrow_release")?.done;

    let nextStage = deal.stage;
    let nextEscrow = deal.escrowStatus;

    if (releaseDone) {
      nextStage = 5;
      nextEscrow = "funds_released";
    } else if (inspectDone) {
      nextStage = 4;
      nextEscrow = "in_inspection";
    } else if (domainDone && codeDone && stripeDone) {
      nextStage = 3;
      nextEscrow = "in_inspection";
    }

    const nextDeal: Deal = {
      ...deal,
      stage: nextStage,
      escrowStatus: nextEscrow,
      checkpoints: updated,
      updatedAt: new Date().toISOString(),
    };

    setDeal(nextDeal);
    setStoredDeals(storedDeals.map((d) => (d.id === nextDeal.id ? nextDeal : d)));
    showToast("Milestone updated & synchronized!");

    try {
      await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: nextStage,
          escrowStatus: nextEscrow,
          checkpoints: updated,
        }),
      });
    } catch (e) {
      console.warn("Server sync error:", e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const msgObj = {
      sender: role,
      text: newMsg.trim(),
    };

    const nextDeal: Deal = {
      ...deal,
      messages: [
        ...deal.messages,
        {
          id: `msg-${Date.now()}`,
          sender: role,
          text: newMsg.trim(),
          time: "Just now",
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    setDeal(nextDeal);
    setNewMsg("");
    setStoredDeals(storedDeals.map((d) => (d.id === nextDeal.id ? nextDeal : d)));

    try {
      await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newMessage: msgObj }),
      });
    } catch (e) {
      console.warn("Message sync error:", e);
    }
  };

  const handleReleaseEscrow = async () => {
    const updatedCheckpoints = deal.checkpoints.map((c) =>
      c.id === "escrow_release"
        ? { ...c, done: true, completedAt: "Released by Mutual Sign-off" }
        : c
    );

    const nextDeal: Deal = {
      ...deal,
      stage: 5,
      escrowStatus: "funds_released",
      checkpoints: updatedCheckpoints,
      messages: [
        ...deal.messages,
        {
          id: `msg-rel-${Date.now()}`,
          sender: "system",
          text: `🎉 ESCROW RELEASED: $${deal.amount.toLocaleString()} has been unlocked and disbursed to ${deal.sellerEmail}. Acquisition complete!`,
          time: "Just now",
        },
      ],
    };

    setDeal(nextDeal);
    showToast("🎉 Escrow funds unlocked & paid out! Acquisition officially closed.");

    try {
      await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 5,
          escrowStatus: "funds_released",
          checkpoints: updatedCheckpoints,
          newMessage: {
            sender: "system",
            text: `🎉 ESCROW RELEASED: $${deal.amount.toLocaleString()} disbursed to seller. Deal closed!`,
          },
        }),
      });
    } catch (e) {
      console.warn("Escrow release error:", e);
    }
  };

  const allAssetsTransferred =
    deal.checkpoints.find((c) => c.id === "domain_transfer")?.done &&
    deal.checkpoints.find((c) => c.id === "code_transfer")?.done &&
    deal.checkpoints.find((c) => c.id === "stripe_transfer")?.done;

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
              border: "2px solid #12b886",
              fontWeight: 600,
            }}
          >
            {toastMsg}
          </div>
        )}

        <Link href="/dashboard" className="back">
          ← Back to Founder Dashboard
        </Link>

        {/* Closing Room Hero */}
        <div className="deal-hero">
          <div>
            <div className="deal-hero-badges">
              <span className="badge-escrow">
                🛡️ Escrow Protected: {deal.escrowStatus === "funds_released" ? "Funds Released ✓" : "100% Secured"}
              </span>
              <span className="badge-deal-id">Deal Room #{deal.id.slice(-6).toUpperCase()}</span>
            </div>
            <h1>Closing Room: {deal.listingName}</h1>
            <p className="sub">
              Secure settlement and asset handover between <strong>{deal.buyerEmail}</strong> (Buyer) and{" "}
              <strong>{deal.sellerEmail}</strong> (Seller).
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
              Switch Perspective:
            </span>
            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn ${role === "founder" ? "active" : ""}`}
                onClick={() => setRole("founder")}
              >
                Founder (Seller)
              </button>
              <button
                type="button"
                className={`role-btn ${role === "buyer" ? "active" : ""}`}
                onClick={() => setRole("buyer")}
              >
                Buyer (Acquirer)
              </button>
            </div>
          </div>
        </div>

        {/* 5-Step Deal Progress Stepper */}
        <div className="deal-stepper">
          {STAGES.map((s) => {
            const isDone = deal.stage > s.step || (deal.stage === 5 && s.step === 5);
            const isActive = deal.stage === s.step && deal.stage !== 5;
            return (
              <div
                key={s.step}
                className={`step-node ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
              >
                <div className="step-node-header">
                  <span className="step-circle">{isDone ? "✓" : s.step}</span>
                  <span>{s.title}</span>
                </div>
                <span className="step-node-desc">{s.desc}</span>
              </div>
            );
          })}
        </div>

        {/* 2-Column Deal Layout */}
        <div className="deal-layout">
          {/* LEFT: ESCROW STATUS & ASSET CHECKLIST */}
          <div>
            {/* Escrow Vault Card */}
            <div className="escrow-vault-card">
              <div className="ev-header">
                <div>
                  <span className="ev-vault-badge">
                    🔒 TrustLedger Escrow Vault
                  </span>
                  <div className="ev-amount-row">
                    <span className="ev-amount">${deal.amount.toLocaleString()}</span>
                    <span className="ev-sub">USD Locked</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowApaModal(true)}
                >
                  📄 View APA Agreement
                </button>
              </div>

              <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.4 }}>
                {deal.escrowStatus === "funds_released"
                  ? "✅ Settlement complete! Funds have been disbursed from escrow directly to the founder's verified payout account."
                  : "Buyer deposit is safely held in FDIC-insured escrow. Funds will not be disbursed until all critical assets (Domain, Code, Stripe) are transferred and inspected."}
              </p>

              <dl className="ev-specs">
                <div>
                  <dt>Escrow Status</dt>
                  <dd style={{ color: deal.escrowStatus === "funds_released" ? "#12b886" : "var(--brand)" }}>
                    {deal.escrowStatus === "funds_released"
                      ? "Funds Disbursed ✓"
                      : deal.escrowStatus === "in_inspection"
                      ? "Inspection Period Active"
                      : "Deposit Secured (Hold)"}
                  </dd>
                </div>
                <div>
                  <dt>Inspection Window</dt>
                  <dd>{deal.escrowStatus === "funds_released" ? "Concluded" : "7 Days Remaining"}</dd>
                </div>
                <div>
                  <dt>Disbursement Method</dt>
                  <dd>Domestic / International Wire</dd>
                </div>
                <div>
                  <dt>Escrow Protection</dt>
                  <dd>Zero chargeback guarantee</dd>
                </div>
              </dl>

              {deal.escrowStatus !== "funds_released" && allAssetsTransferred && (
                <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
                  <button
                    type="button"
                    className="btn btn-brand"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={handleReleaseEscrow}
                  >
                    Release Escrow Funds (${deal.amount.toLocaleString()}) →
                  </button>
                  <small style={{ display: "block", textAlign: "center", color: "var(--muted)", marginTop: "0.4rem" }}>
                    Mutual sign-off: releases payment to founder and closes deal room.
                  </small>
                </div>
              )}
            </div>

            {/* Handover Milestone Checklist */}
            <div className="checklist-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                <h3>Asset Handover Milestones</h3>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--muted)" }}>
                  {deal.checkpoints.filter((c) => c.done).length} of {deal.checkpoints.length} Completed
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>
                Both parties should check off each deliverable as credentials and access rights are granted.
              </p>

              <div>
                {deal.checkpoints.map((chk) => (
                  <div key={chk.id} className="cl-item">
                    <button
                      type="button"
                      aria-label={`Toggle ${chk.title}`}
                      className={`cl-check ${chk.done ? "checked" : ""}`}
                      onClick={() => toggleCheckpoint(chk.id)}
                    >
                      {chk.done ? "✓" : ""}
                    </button>
                    <div className="cl-content">
                      <h4 style={{ textDecoration: chk.done ? "line-through" : "none" }}>{chk.title}</h4>
                      <p>{chk.desc}</p>
                      {chk.completedAt && (
                        <span className="cl-timestamp">✓ {chk.completedAt}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: DEAL ROOM ACTIVITY & COMMUNICATION */}
          <div>
            {/* Legal Terms Overview */}
            <div className="deal-side-box">
              <h3 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Transaction Summary</h3>
              <dl className="deal-terms-dl">
                <dt>Asset</dt>
                <dd>{deal.listingName}</dd>
                <dt>Agreed Price</dt>
                <dd style={{ color: "var(--ink)", fontWeight: 800 }}>${deal.amount.toLocaleString()}</dd>
                <dt>Buyer</dt>
                <dd style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>{deal.buyerEmail}</dd>
                <dt>Seller</dt>
                <dd style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>{deal.sellerEmail}</dd>
                <dt>Non-Compete</dt>
                <dd>24 Months</dd>
                <dt>Founder Support</dt>
                <dd>30 Days Transition</dd>
              </dl>
            </div>

            {/* Handover Chat & Secure Messaging */}
            <div className="deal-side-box">
              <h3 style={{ fontSize: "1.05rem", marginBottom: "0.25rem" }}>Handover Communication</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                Exchanging messages as: <strong style={{ color: "var(--ink)" }}>{role === "founder" ? "Founder" : "Buyer"}</strong>
              </p>

              <div className="chat-history">
                {deal.messages.map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.sender}`}>
                    <div className="chat-meta">
                      <span>
                        {m.sender === "system"
                          ? "🤖 TrustLedger Escrow System"
                          : m.sender === "founder"
                          ? "👤 Founder (Seller)"
                          : "💼 Buyer (Acquirer)"}
                      </span>
                      <span style={{ fontWeight: 500, color: "var(--muted)" }}>{m.time}</span>
                    </div>
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                  type="text"
                  className="chat-input"
                  placeholder={
                    role === "founder"
                      ? "Send credentials, repo transfer note, or DNS instructions..."
                      : "Confirm receipt of domain or ask technical question..."
                  }
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                />
                <button type="submit" className="btn btn-brand btn-sm">
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Printable APA Agreement Modal */}
        {showApaModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.65)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
            }}
            onClick={() => setShowApaModal(false)}
          >
            <div
              style={{
                background: "var(--surface)",
                maxWidth: "680px",
                width: "100%",
                borderRadius: "var(--radius)",
                padding: "2rem",
                maxHeight: "90vh",
                overflowY: "auto",
                border: "2px solid var(--line)",
                boxShadow: "var(--shadow-lg)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h2>Digital Asset Purchase Agreement (APA)</h2>
                <button
                  type="button"
                  style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--muted)" }}
                  onClick={() => setShowApaModal(false)}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
                Standard Digital Asset Acquisition Covenant under TrustLedger Escrow Protocols.
              </p>

              <div style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--ink)", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <p>
                  <strong>1. The Parties:</strong> This agreement is between the Seller (Founder of {deal.listingName}) and Buyer ({deal.buyerEmail}).
                </p>
                <p>
                  <strong>2. Purchased Assets:</strong> The sale includes all domain registrations, intellectual property, GitHub source code repositories, databases, active customer subscriptions, customer lists, and trademarks associated with {deal.listingName}.
                </p>
                <p>
                  <strong>3. Purchase Consideration:</strong> The total agreed acquisition price is <strong>${deal.amount.toLocaleString()} USD</strong>, funded into TrustLedger Escrow.
                </p>
                <p>
                  <strong>4. Inspection & Handover:</strong> The Buyer is granted a 7 calendar-day inspection period from the completion of asset transfer to verify codebase integrity and revenue authenticity.
                </p>
                <p>
                  <strong>5. Non-Compete:</strong> Seller covenants not to launch, develop, or operate a directly competing product in the same specific niche for a period of 24 consecutive months.
                </p>
              </div>

              <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => window.print()}
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={() => setShowApaModal(false)}
                >
                  Close Agreement
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

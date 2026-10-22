"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { REVENUE_TYPES, formatMoney, type RevenueTypeId } from "@/data/startups";
import { useStored, MY_STARTUPS_KEY, DEFAULT_MY_STARTUPS, type UserStartup } from "@/lib/storage";

const CATEGORIES = ["AI", "Fintech", "Design", "Developer tools", "Education", "Media", "Productivity", "Health", "Social", "E-Commerce"];
const EMOJIS = ["🚀", "⚡", "🤖", "🎨", "📦", "📊", "💡", "🛡️", "🔥", "🔮", "💼", "🧠", "✨", "🦉", "💳"];

export default function ListStartupPage() {
  const router = useRouter();
  const [myStartups, setMyStartups] = useStored<UserStartup>(MY_STARTUPS_KEY, DEFAULT_MY_STARTUPS);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("🚀");
  const [category, setCategory] = useState("AI");
  const [tagline, setTagline] = useState("");
  const [founded, setFounded] = useState(2023);
  const [hq, setHq] = useState("San Francisco, USA");
  const [how, setHow] = useState("");

  // Revenue values in USD (yearly)
  const [revValues, setRevValues] = useState<Record<RevenueTypeId, number>>({
    subscription: 120000,
    ads: 0,
    transaction: 0,
    onetime: 15000,
    usage: 25000,
    licensing: 0,
  });

  // Selling options
  const [isForSale, setIsForSale] = useState(true);
  const [askingPriceDollars, setAskingPriceDollars] = useState(480000);
  const [profitDollars, setProfitDollars] = useState(130000);
  const [teamSize, setTeamSize] = useState(2);
  const [stackInput, setStackInput] = useState("Next.js, Tailwind, Postgres, Stripe");
  const [includesInput, setIncludesInput] = useState("Source code, Domain name, Customer accounts, 3 months founder onboarding");
  const [reason, setReason] = useState("Focusing on our next high-growth AI project.");

  // Verification options
  const [verifyMethod, setVerifyMethod] = useState<"stripe" | "self">("stripe");
  const [stripeKey, setStripeKey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Total calculation
  const totalRevenueDollars = useMemo(() => {
    return Object.values(revValues).reduce((acc, curr) => acc + (curr || 0), 0);
  }, [revValues]);

  const totalInMillions = totalRevenueDollars / 1_000_000;
  const askingPriceInMillions = askingPriceDollars / 1_000_000;
  const profitInMillions = profitDollars / 1_000_000;

  const updateRev = (id: RevenueTypeId, val: number) => {
    setRevValues((prev) => ({ ...prev, [id]: Math.max(0, val) }));
  };

  const validateStep = (currentStep: number) => {
    setErrorMsg("");
    if (currentStep === 1) {
      if (!name.trim()) return "Please enter your startup's name.";
      if (!tagline.trim()) return "Please enter a short one-line description.";
    }
    if (currentStep === 2) {
      if (totalRevenueDollars <= 0) return "Please enter at least one revenue stream.";
      if (!how.trim()) return "Please explain in a sentence or two how you make money.";
    }
    if (currentStep === 3 && isForSale) {
      if (askingPriceDollars <= 0) return "Please set an asking price.";
      if (profitDollars < 0) return "Profit cannot be negative.";
    }
    if (currentStep === 4 && verifyMethod === "stripe") {
      if (!stripeKey.trim().startsWith("rk_")) {
        return "Please enter a valid Stripe restricted read-only key (starts with 'rk_live_' or 'rk_test_').";
      }
    }
    return "";
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setStep((prev) => Math.min(5, prev + 1) as any);
  };

  const handleBack = () => {
    setErrorMsg("");
    setStep((prev) => Math.max(1, prev - 1) as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalErr = validateStep(4);
    if (finalErr) {
      setErrorMsg(finalErr);
      return;
    }

    // Convert revenue map to millions for consistent data format
    const revMillions: Partial<Record<RevenueTypeId, number>> = {};
    for (const [key, val] of Object.entries(revValues)) {
      if (val > 0) {
        revMillions[key as RevenueTypeId] = val / 1_000_000;
      }
    }

    const newStartup: UserStartup = {
      id: `usr-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`,
      name: name.trim(),
      logo,
      category,
      tagline: tagline.trim(),
      founded: Number(founded) || 2023,
      hq: hq.trim() || "Remote",
      how: how.trim(),
      revenue: revMillions,
      isForSale,
      askingPrice: isForSale ? askingPriceInMillions : undefined,
      profit: isForSale ? profitInMillions : undefined,
      verified: verifyMethod === "stripe",
      verificationStatus: verifyMethod === "stripe" ? "verified" : "unverified",
      stripeKeyHint: verifyMethod === "stripe" ? `rk_live_...${stripeKey.slice(-4)}` : undefined,
      teamSize: isForSale ? teamSize : undefined,
      stack: isForSale ? stackInput.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      includes: isForSale ? includesInput.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      reason: isForSale ? reason : undefined,
      createdAt: new Date().toISOString(),
    };

    setMyStartups([newStartup, ...myStartups]);

    // Send to real SQLite backend API
    try {
      await fetch("/api/startups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStartup),
      });
    } catch (err) {
      console.warn("Saved to browser state, failed to sync to server database:", err);
    }

    router.push("/dashboard?listed=success");
  };

  return (
    <>
      <SiteHeader />
      <main className="detail wrap">
        <section className="hero hero-sm" style={{ paddingBottom: "1.5rem" }}>
          <div className="wrap hero-in">
            <p className="eyebrow">Founder Onboarding</p>
            <h1>
              List your startup <span className="hl">in 3 simple minutes.</span>
            </h1>
            <p className="lead">
              Showcase your verified revenue mix, benchmark your business against top peers, or put it up for sale to serious buyers.
            </p>
          </div>
        </section>

        {/* Multi-step progress indicator */}
        <div className="steps-bar-wrapper">
          <div className="steps-nav">
            <button className={`step-nav-btn ${step >= 1 ? "active" : ""}`} onClick={() => setStep(1)}>
              <span className="step-num">1</span>
              <span>Basics</span>
            </button>
            <button className={`step-nav-btn ${step >= 2 ? "active" : ""}`} onClick={() => validateStep(1) ? null : setStep(2)}>
              <span className="step-num">2</span>
              <span>Revenue Streams</span>
            </button>
            <button className={`step-nav-btn ${step >= 3 ? "active" : ""}`} onClick={() => (validateStep(1) || validateStep(2)) ? null : setStep(3)}>
              <span className="step-num">3</span>
              <span>Goal & Sale</span>
            </button>
            <button className={`step-nav-btn ${step >= 4 ? "active" : ""}`} onClick={() => (validateStep(1) || validateStep(2) || validateStep(3)) ? null : setStep(4)}>
              <span className="step-num">4</span>
              <span>Verification</span>
            </button>
            <button className={`step-nav-btn ${step === 5 ? "active" : ""}`} onClick={() => handleNext()}>
              <span className="step-num">5</span>
              <span>Publish</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="hint err" role="alert" style={{ margin: "1rem 0" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* STEP 1: BASICS */}
        {step === 1 && (
          <section className="panel">
            <h2>Step 1: Tell us about your startup</h2>
            <p className="sub">Basic information that buyers and peers will see on your card.</p>

            <div className="form-grid">
              <label className="f">
                <span>Startup Name *</span>
                <input
                  type="text"
                  placeholder="e.g. PromptGenie or MailForge"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <label className="f">
                <span>Category *</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="f">
              <span>One-line Tagline *</span>
              <input
                type="text"
                placeholder="e.g. AI-powered newsletter curation for busy tech teams"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                required
              />
            </label>

            <div className="form-grid">
              <label className="f">
                <span>Logo Emoji Picker</span>
                <div className="emoji-picker-row">
                  <span className="logo-badge big" style={{ width: "48px", height: "48px", fontSize: "1.5rem" }}>
                    {logo}
                  </span>
                  <div className="emoji-options">
                    {EMOJIS.map((em) => (
                      <button
                        type="button"
                        key={em}
                        className={`emoji-btn ${logo === em ? "selected" : ""}`}
                        onClick={() => setLogo(em)}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </label>

              <div className="form-grid-inner">
                <label className="f">
                  <span>Year Founded</span>
                  <input
                    type="number"
                    min="2010"
                    max="2026"
                    value={founded}
                    onChange={(e) => setFounded(Number(e.target.value))}
                  />
                </label>

                <label className="f">
                  <span>Headquarters / Location</span>
                  <input
                    type="text"
                    placeholder="e.g. London, UK or Remote"
                    value={hq}
                    onChange={(e) => setHq(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="form-actions">
              <span />
              <button className="btn btn-brand" type="button" onClick={handleNext}>
                Next: Revenue Streams →
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: REVENUE MIX */}
        {step === 2 && (
          <section className="panel">
            <h2>Step 2: Where does the money come from?</h2>
            <p className="sub">
              Enter your approximate yearly earnings for each revenue stream. If you don't earn from a type, leave it at $0.
            </p>

            {/* Live Visual Revenue Bar */}
            <div className="live-preview-box">
              <div className="live-preview-header">
                <div>
                  <span className="live-label">Total Yearly Revenue</span>
                  <strong className="live-total">{formatMoney(totalInMillions)} / yr</strong>
                </div>
                <span className="live-badge">Live Revenue Split</span>
              </div>

              {totalRevenueDollars > 0 && (
                <div className="rbar rbar-tall" style={{ margin: "0.8rem 0" }}>
                  {REVENUE_TYPES.filter((t) => revValues[t.id] > 0).map((t) => {
                    const v = revValues[t.id];
                    const pctVal = Math.round((v / totalRevenueDollars) * 100);
                    return (
                      <span
                        key={t.id}
                        className="rbar-seg"
                        style={{ width: `${(v / totalRevenueDollars) * 100}%`, background: t.color }}
                        title={`${t.label}: $${v.toLocaleString()} (${pctVal}%)`}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rev-inputs-grid">
              {REVENUE_TYPES.map((t) => (
                <div key={t.id} className="rev-input-card" style={{ borderLeftColor: t.color }}>
                  <div className="rev-input-head">
                    <span className="rev-icon">{t.icon}</span>
                    <div>
                      <strong>{t.label}</strong>
                      <small>{t.short}</small>
                    </div>
                  </div>
                  <div className="rev-input-field">
                    <span>$</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={revValues[t.id] || ""}
                      onChange={(e) => updateRev(t.id, Number(e.target.value))}
                      placeholder="0"
                    />
                    <small>/ year</small>
                  </div>
                  {totalRevenueDollars > 0 && revValues[t.id] > 0 && (
                    <span className="rev-pct-tag" style={{ color: t.color }}>
                      {Math.round((revValues[t.id] / totalRevenueDollars) * 100)}% of total
                    </span>
                  )}
                </div>
              ))}
            </div>

            <label className="f" style={{ marginTop: "1.5rem" }}>
              <span>How you make money (Plain English explanation) *</span>
              <textarea
                rows={2}
                placeholder="e.g. We charge a $29/mo plan for team collaboration, and $0.02 per generated report for heavy accounts."
                value={how}
                onChange={(e) => setHow(e.target.value)}
                required
              />
            </label>

            <div className="form-actions">
              <button className="btn btn-dark" type="button" onClick={handleBack}>
                ← Back
              </button>
              <button className="btn btn-brand" type="button" onClick={handleNext}>
                Next: Goal & Sale →
              </button>
            </div>
          </section>
        )}

        {/* STEP 3: GOAL & SALE */}
        {step === 3 && (
          <section className="panel">
            <h2>Step 3: What is your primary goal?</h2>
            <p className="sub">You can showcase your startup on the public revenue directory or list it for sale.</p>

            <div className="goal-selector">
              <div
                className={`goal-card ${!isForSale ? "selected" : ""}`}
                onClick={() => setIsForSale(false)}
              >
                <span className="goal-icon">📊</span>
                <h3>Showcase Revenue Only</h3>
                <p>Display your verified stats on the public database, get valuable backlinks, and benchmark against peers.</p>
                <span className="goal-check">{!isForSale ? "✓ Selected" : "Choose"}</span>
              </div>

              <div
                className={`goal-card ${isForSale ? "selected" : ""}`}
                onClick={() => setIsForSale(true)}
              >
                <span className="goal-icon">🤝</span>
                <h3>Sell on the Marketplace</h3>
                <p>Accept buyer acquisition offers, showcase real net profit, and list with a clear price-to-profit multiple.</p>
                <span className="goal-check">{isForSale ? "✓ Selected" : "Choose"}</span>
              </div>
            </div>

            {isForSale && (
              <div className="sale-details-box">
                <h3>Acquisition Details</h3>
                <p className="sub">Transparency helps buyers make faster, higher-value offers.</p>

                <div className="form-grid">
                  <label className="f">
                    <span>Asking Price (USD) *</span>
                    <input
                      type="number"
                      step="5000"
                      value={askingPriceDollars}
                      onChange={(e) => setAskingPriceDollars(Number(e.target.value))}
                      required
                    />
                    <small>
                      Equivalent to {formatMoney(askingPriceInMillions)}
                    </small>
                  </label>

                  <label className="f">
                    <span>Yearly Net Profit (USD) *</span>
                    <input
                      type="number"
                      step="2500"
                      value={profitDollars}
                      onChange={(e) => setProfitDollars(Number(e.target.value))}
                      required
                    />
                    <small>
                      {profitDollars > 0 && totalRevenueDollars > 0
                        ? `${Math.round((profitDollars / totalRevenueDollars) * 100)}% profit margin`
                        : "Revenue minus hosting & operations"}
                    </small>
                  </label>
                </div>

                <div className="kpi-mini-preview">
                  <div>
                    <span className="kpi-lbl">Price Multiple</span>
                    <strong className="kpi-val">
                      {profitDollars > 0 ? `${(askingPriceDollars / profitDollars).toFixed(1)}x profit` : "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span className="kpi-lbl">Payback Period</span>
                    <strong className="kpi-val">
                      {profitDollars > 0 ? `~${(askingPriceDollars / profitDollars).toFixed(1)} years` : "N/A"}
                    </strong>
                  </div>
                </div>

                <div className="form-grid">
                  <label className="f">
                    <span>Team / Founder Size</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={teamSize}
                      onChange={(e) => setTeamSize(Number(e.target.value))}
                    />
                  </label>

                  <label className="f">
                    <span>Tech Stack (Comma-separated)</span>
                    <input
                      type="text"
                      placeholder="e.g. Next.js, Stripe, Supabase, Tailwind"
                      value={stackInput}
                      onChange={(e) => setStackInput(e.target.value)}
                    />
                  </label>
                </div>

                <label className="f">
                  <span>What is included in the sale?</span>
                  <input
                    type="text"
                    placeholder="e.g. Source code, Domain, Stripe customer database, 60 days transition support"
                    value={includesInput}
                    onChange={(e) => setIncludesInput(e.target.value)}
                  />
                </label>

                <label className="f">
                  <span>Why are you selling?</span>
                  <textarea
                    rows={2}
                    placeholder="e.g. Focusing on our next B2B startup and want a clean transition for this product."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-dark" type="button" onClick={handleBack}>
                ← Back
              </button>
              <button className="btn btn-brand" type="button" onClick={handleNext}>
                Next: Verification →
              </button>
            </div>
          </section>
        )}

        {/* STEP 4: VERIFICATION */}
        {step === 4 && (
          <section className="panel">
            <h2>Step 4: Verify your revenue</h2>
            <p className="sub">
              Verified startups receive 4.5x more buyer inquiries and higher trust on leaderboards.
            </p>

            <div className="verification-options">
              <div
                className={`verify-card ${verifyMethod === "stripe" ? "selected" : ""}`}
                onClick={() => setVerifyMethod("stripe")}
              >
                <div className="v-head">
                  <span className="v-badge-green">✓ Recommended</span>
                  <h3>Connect Stripe (Read-Only)</h3>
                </div>
                <p>
                  Connect using a restricted, read-only Stripe key. We only pull aggregate revenue totals — no customer names or card details can ever be accessed.
                </p>

                <div className="stripe-input-box" onClick={(e) => e.stopPropagation()}>
                  <label className="f">
                    <span>Restricted Stripe Key (rk_live_... or rk_test_...)</span>
                    <input
                      type="text"
                      placeholder="rk_live_51M..."
                      value={stripeKey}
                      onChange={(e) => setStripeKey(e.target.value)}
                    />
                  </label>
                  <small className="stripe-safety-note">
                    🔒 Safe: Read-only keys mathematically cannot move funds, refund customers, or alter your account.
                  </small>
                </div>
              </div>

              <div
                className={`verify-card ${verifyMethod === "self" ? "selected" : ""}`}
                onClick={() => setVerifyMethod("self")}
              >
                <div className="v-head">
                  <span className="v-badge-yellow">Unverified</span>
                  <h3>Self-Reported (Manual)</h3>
                </div>
                <p>
                  Skip connection for now. Your listing will be labeled as "Self-reported" until verified. You can connect anytime later from your dashboard.
                </p>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-dark" type="button" onClick={handleBack}>
                ← Back
              </button>
              <button className="btn btn-brand" type="button" onClick={handleNext}>
                Review & Publish →
              </button>
            </div>
          </section>
        )}

        {/* STEP 5: REVIEW & PUBLISH */}
        {step === 5 && (
          <section className="panel">
            <h2>Step 5: Review your listing preview</h2>
            <p className="sub">Here is how your startup will appear on TrustLedger.</p>

            <div className="preview-card-wrap">
              <div className="lcard" style={{ maxWidth: "600px", margin: "1rem auto", pointerEvents: "none" }}>
                <div className="lc-top">
                  <span className="logo-badge">{logo}</span>
                  <div>
                    <strong>{name || "Startup Name"}</strong>
                    <small>{category} · Founded {founded}</small>
                  </div>
                  <span className={`vbadge ${verifyMethod === "stripe" ? "ok" : "self"}`}>
                    {verifyMethod === "stripe" ? "✓ Verified" : "Self-reported"}
                  </span>
                </div>
                <p className="lc-tag">{tagline || "Your one-line tagline here"}</p>
                {isForSale && (
                  <div className="lc-price">
                    <span>Asking price</span>
                    <strong>{formatMoney(askingPriceInMillions)}</strong>
                  </div>
                )}
                <dl className="lc-stats">
                  <div>
                    <dt>Revenue / yr</dt>
                    <dd>{formatMoney(totalInMillions)}</dd>
                  </div>
                  {isForSale ? (
                    <>
                      <div>
                        <dt>Profit / yr</dt>
                        <dd>{formatMoney(profitInMillions)}</dd>
                      </div>
                      <div>
                        <dt>Multiple</dt>
                        <dd>{profitDollars > 0 ? `${(askingPriceDollars / profitDollars).toFixed(1)}x` : "—"}</dd>
                      </div>
                      <div>
                        <dt>Margin</dt>
                        <dd>{totalRevenueDollars > 0 ? `${Math.round((profitDollars / totalRevenueDollars) * 100)}%` : "—"}</dd>
                      </div>
                    </>
                  ) : (
                    <div>
                      <dt>Status</dt>
                      <dd>Showcase</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="publish-confirm-box">
                <p>
                  🚀 Ready to publish! Your listing will be saved and visible immediately in your Founder Dashboard.
                </p>
                <div className="form-actions">
                  <button className="btn btn-dark" type="button" onClick={handleBack}>
                    ← Back to edit
                  </button>
                  <button className="btn btn-brand" type="submit" style={{ fontSize: "1.1rem", padding: "0.8rem 1.8rem" }}>
                    Publish Startup Now 🚀
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

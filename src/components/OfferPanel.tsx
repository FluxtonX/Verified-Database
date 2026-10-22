"use client";

import { useState } from "react";
import { OFFERS_KEY, SAVED_KEY, useStored, type Offer } from "@/lib/storage";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function OfferPanel({
  listingId,
  listingName,
  askingDollars,
}: {
  listingId: string;
  listingName: string;
  askingDollars: number;
}) {
  const [offers, setOffers] = useStored<Offer>(OFFERS_KEY);
  const [saved, setSaved] = useStored<string>(SAVED_KEY);
  const [amount, setAmount] = useState(String(askingDollars));
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [justSent, setJustSent] = useState(false);

  const mine = offers.filter((o) => o.listingId === listingId);
  const isSaved = saved.includes(listingId);
  const amountNum = Number(amount);
  const lowball = amountNum > 0 && amountNum < askingDollars * 0.5;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountNum || amountNum <= 0) return setError("Enter an offer amount in dollars.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email so the seller can reply.");
    setError("");

    const offer: Offer = {
      id: crypto.randomUUID(),
      listingId,
      listingName,
      amount: amountNum,
      email,
      message,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    // Save to local storage for immediate offline/client reactivity
    setOffers([offer, ...offers]);

    // Persist to real backend API & SQLite database
    try {
      await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          listingName,
          amount: amountNum,
          email,
          message,
        }),
      });
    } catch (err) {
      console.warn("Saved locally, network error syncing to backend:", err);
    }

    setJustSent(true);
    setMessage("");
  };

  const toggleSave = () =>
    setSaved(isSaved ? saved.filter((id) => id !== listingId) : [...saved, listingId]);

  return (
    <aside className="offer">
      <div className="offer-price">
        <span>Asking price</span>
        <strong>{usd(askingDollars)}</strong>
      </div>

      {justSent ? (
        <div className="offer-ok" role="status">
          <b>✅ Offer sent</b>
          <p>
            The seller of {listingName} has your offer. In the real site they would be notified
            and could reply by email. This is demo data stored only in your browser.
          </p>
          <button className="btn btn-dark" onClick={() => setJustSent(false)}>
            Make another offer
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <label className="f">
            <span>Your offer (USD)</span>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          {lowball && (
            <p className="hint warn">
              This is under half the asking price. Offers that low are rarely accepted.
            </p>
          )}
          <label className="f">
            <span>Your email</span>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="f">
            <span>Message to the seller (optional)</span>
            <textarea
              rows={3}
              placeholder="Tell them about you and what you plan to do with the business."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          {error && (
            <p className="hint err" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-brand wide" type="submit">
            Send offer
          </button>
        </form>
      )}

      <button className={`save ${isSaved ? "on" : ""}`} onClick={toggleSave} type="button">
        {isSaved ? "♥ Saved" : "♡ Save for later"}
      </button>

      {mine.length > 0 && (
        <div className="mine">
          <h4>Your offers on this startup</h4>
          <ul>
            {mine.map((o) => (
              <li key={o.id}>
                <strong>{usd(o.amount)}</strong>
                <span>{new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <em className={`st ${o.status}`}>{o.status}</em>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="safe">
        🔒 Payment will go through a protected escrow so money is only released when the business
        is handed over. Coming with the backend.
      </p>
    </aside>
  );
}

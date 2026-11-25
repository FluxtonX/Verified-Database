"use client";

import { useState, useTransition } from "react";
import { deleteStartup, disconnectSource } from "@/app/dashboard/actions";

/** Two-step "Disconnect" for one payment provider. */
export function DisconnectSource({ sourceId, startupId, name }: { sourceId: string; startupId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return <span className="source-actions">
    <button type="button" className="text-link danger-link" disabled={pending} onClick={() => {
      if (!confirming) { setConfirming(true); return; }
      start(async () => {
        try { setError((await disconnectSource(sourceId, startupId)).error ?? ""); } catch { setError("Couldn’t disconnect this provider. Try again."); }
        setConfirming(false);
      });
    }}>{pending ? "Disconnecting…" : confirming ? `Confirm disconnect ${name}` : "Disconnect"}</button>
    {confirming && !pending && <button type="button" className="text-link" onClick={() => setConfirming(false)}>Cancel</button>}
    {error && <span className="seller-error" role="alert">{error}</span>}
  </span>;
}

/** Deleting a startup is permanent, so it needs the name typed back. */
export function DeleteStartup({ id, name, listed }: { id: string; name: string; listed: boolean }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return <section className="danger-zone" aria-labelledby={`delete-${id}`}>
    <div>
      <h3 id={`delete-${id}`}>Delete startup</h3>
      <p className="muted">{listed
        ? "Withdraw the marketplace listing before deleting this startup."
        : "Removes the draft, its connected providers and logo. If it was published, it comes off the leaderboard. This can’t be undone."}</p>
    </div>
    {!open ? <button type="button" className="seller-button danger-button" disabled={listed} onClick={() => setOpen(true)}>Delete startup</button>
      : <form className="seller-form" onSubmit={event => {
        event.preventDefault();
        start(async () => {
          try { const result = await deleteStartup(id); if (result?.error) setError(result.error); } catch { setError("Couldn’t delete this startup. Try again."); }
        });
      }}>
        <label><span>Type <strong>{name}</strong> to confirm</span><input value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" /></label>
        <div className="seller-form-actions">
          {error && <span className="seller-error" role="alert">{error}</span>}
          <button type="button" className="seller-button" onClick={() => { setOpen(false); setTyped(""); }}>Cancel</button>
          <button className="startup-submit danger-submit" disabled={pending || typed.trim() !== name.trim()}>{pending ? "Deleting…" : "Delete permanently"}</button>
        </div>
      </form>}
  </section>;
}

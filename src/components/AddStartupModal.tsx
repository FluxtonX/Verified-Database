"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { saveStartup } from "@/app/catalog-actions";
import { useActionState, useEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "./icons";

function Toggle({ label, name, info, initial = false }: {
  label: string; name: string; info?: string; initial?: boolean;
}) {
  const [checked, setChecked] = useState(initial);

  return (
    <div className="startup-toggle-row">
      {checked && <input type="hidden" name={name} value="on" />}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="startup-toggle"
        onClick={() => setChecked(!checked)}
      >
        <span />
      </button>
      <span>{label}</span>
      {info && (
        <span className="startup-info" title={info} aria-label={info}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 10v7m0-11v1" />
          </svg>
        </span>
      )}
    </div>
  );
}

export default function AddStartupModal({ onClose, triggerRef, signedIn, categories, next, configured }: {
  signedIn: boolean;
  categories: string[];
  next: string;
  configured: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [handle, setHandle] = useState("");
  const [category, setCategory] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [result, action, pending] = useActionState(saveStartup, {});
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const addons = [
    {
      id: "dofollow",
      title: "Dofollow link · Domain Authority 69",
      price: "$19",
      description: "Build trust with a verified revenue profile and an authority link that helps search engines and AI assistants recognize your site as the canonical destination.",
    },
    {
      id: "ai-visibility",
      title: "AI visibility boost",
      price: "$79",
      description: "Give ChatGPT and other AI assistants a verified VerifedDB profile they can use to recognize and recommend your startup as a trusted tool.",
    },
    {
      id: "sponsor",
      title: "Side-panel sponsor spot",
      price: "$399",
      description: "Put your startup in the sponsor panels across VerifedDB for 7 days, in front of 200K monthly visitors.",
    },
  ];

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>("#startup-name")?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";

    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [triggerRef]);

  return (
    <dialog
      ref={dialogRef}
      className="startup-dialog"
      aria-labelledby="add-startup-title"
      aria-describedby="add-startup-description"
      onCancel={onClose}
      onClick={event => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
        }
      }}
    >
      <header className="startup-dialog-header">
        <div className="startup-title-row">
          <h2 id="add-startup-title">Add your startup</h2>
        </div>
        <p id="add-startup-description">Save a private draft to get started.</p>
        <button type="button" className="startup-close" onClick={onClose} aria-label="Close add startup dialog"><Icon name="close" size={20} /></button>
      </header>

      {!signedIn ? <div className="startup-dialog-body">
        <p>{configured ? "Sign in to save your startup draft." : "Startup drafts will be available once Supabase is configured."}</p>
        {configured && <Link className="marketplace-account-link" href={`/login?next=${encodeURIComponent(next)}`}>Continue to login</Link>}
      </div> : result.saved ? <div className="startup-dialog-body">
        <p role="status">Draft saved. Your startup stays private while revenue verification is pending.</p>
        <button type="button" className="startup-submit" onClick={onClose}>Done</button>
      </div> : <form className="startup-form" action={action}>
        <div className="startup-dialog-body">
          <div className="startup-draft-fields">
            <label htmlFor="startup-name">Startup name</label>
            <input id="startup-name" name="name" type="text" value={name} onChange={event => setName(event.target.value)} maxLength={100} required autoFocus />
            <label htmlFor="startup-website">Website</label>
            <input id="startup-website" name="website" type="url" value={website} onChange={event => setWebsite(event.target.value)} placeholder="https://example.com" maxLength={2048} required />
            <label htmlFor="startup-category">Category</label>
            <div className="startup-provider-select startup-category-select">
              <select id="startup-category" name="category" value={category} onChange={event => setCategory(event.target.value)} required>
                <option value="" disabled>Select a category</option>
                {categories.map(category => <option key={category}>{category}</option>)}
              </select>
            </div>
          </div>

          <div className="startup-provider-field">
            <p>Payment provider <strong>Stripe</strong></p>
            <p>Connect Stripe after revenue verification is available.</p>
          </div>

          <div className="startup-handle-field">
            <label htmlFor="startup-x-handle">𝕏 handle (optional)</label>
            <input id="startup-x-handle" name="x-handle" type="text" value={handle} onChange={event => setHandle(event.target.value)} placeholder="username" autoComplete="off" spellCheck={false} />
          </div>

          <Toggle name="anonymous" label="Anonymous mode" info="Hide your startup’s name and details on the public leaderboard." />

          <div className="startup-addons" aria-label="Optional startup add-ons">
            <p>Save your add-on interests for later.</p>
            {addons.map(addon => (
              <label className="startup-addon" key={addon.id}>
                <input
                  type="checkbox" name="addon" value={addon.id}
                  checked={selectedAddons.includes(addon.id)}
                  onChange={event => setSelectedAddons(current =>
                    event.target.checked ? [...current, addon.id] : current.filter(id => id !== addon.id)
                  )}
                />
                <span className="startup-addon-content">
                  <span className="startup-addon-title"><span>{addon.title}</span><strong>{addon.price}</strong></span>
                  <span className="startup-addon-description">{addon.description}</span>
                </span>
              </label>
            ))}
          </div>

          <figure className="startup-testimonial">
            <div className="startup-testimonial-stars" role="img" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }, (_, index) => (
                <svg key={index} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.5 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.1l6.3-.9Z" /></svg>
              ))}
            </div>
            <blockquote>“The ROI has been outstanding – tons of new signups, new trials booked. Over 60% of my traffic this week came from VerifedDB. Money well spent.”</blockquote>
            <figcaption>
              <img src="/assets/testimonial-ryan.jpg" width="20" height="20" alt="" />
              <span>Ryan Vogel</span><span className="testimonial-business">· Inbound Email</span>
            </figcaption>
            <div className="startup-testimonial-dots" aria-hidden="true"><span /><span /><span className="active" /><span /></div>
          </figure>

          {result.error && <p role="alert">{result.error}</p>}
        </div>

        <div className="startup-dialog-footer">
          <Toggle name="wants-sale" label="List for sale" initial={next.startsWith("/acquire")} />
          <button type="submit" className="startup-submit" disabled={pending || !categories.length}>{pending ? "Saving…" : "Save draft"}</button>
        </div>
      </form>}
    </dialog>
  );
}

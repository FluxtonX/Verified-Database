"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "./icons";

function Toggle({ label, info }: { label: string; info?: string }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="startup-toggle-row">
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

export default function AddStartupModal({ onClose, triggerRef }: {
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const provider = "Stripe";
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
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>("#startup-api-key")?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";

    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus({ preventScroll: true });
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
          <span className="startup-visitors"><span className="visitor-dot" /><strong>13,393</strong> visitors today</span>
        </div>
        <p id="add-startup-description">Showcase your revenue to <strong>200K monthly visitors</strong>. It&apos;s free!</p>
        <button type="button" className="startup-close" onClick={onClose} aria-label="Close add startup dialog"><Icon name="close" size={20} /></button>
      </header>

      <form className="startup-form" onSubmit={event => event.preventDefault()}>
        <div className="startup-dialog-body">
          <div className="startup-provider-field">
            <label htmlFor="startup-provider">Choose your payment provider</label>
            <div className="startup-provider-select">
              <span className="provider-mark" aria-hidden="true">{provider === "Stripe" ? "S" : provider[0]}</span>
              <select id="startup-provider" defaultValue={provider}>
                <option>Stripe</option>
              </select>
              <svg className="provider-chevrons" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4.5 6 3.5-3.5L11.5 6m-7 4L8 13.5l3.5-3.5" /></svg>
            </div>
          </div>

          <div className="startup-key-field">
            <label htmlFor="startup-api-key">1. {provider} API key</label>
            <input id="startup-api-key" name="api-key" type="text" placeholder="rk_live_..." autoComplete="off" spellCheck={false} required autoFocus />
            <a className="startup-key-help" href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
              <div>
                <p>Click here to create a read-only API key.</p>
                <ol>
                  <li>Scroll down and click &apos;Create key&apos;</li>
                  <li>Don&apos;t change the permissions</li>
                  <li>Don&apos;t delete the key or we can&apos;t refresh revenue</li>
                </ol>
              </div>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14m0-9H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></svg>
            </a>
          </div>

          <div className="startup-handle-field">
            <label htmlFor="startup-x-handle">2. 𝕏 handle (optional)</label>
            <input id="startup-x-handle" name="x-handle" type="text" placeholder="username" autoComplete="off" spellCheck={false} />
          </div>

          <Toggle label="Anonymous mode" info="Hide your startup’s name and details on the public leaderboard." />

          <div className="startup-addons" aria-label="Optional startup add-ons">
            {addons.map(addon => (
              <label className="startup-addon" key={addon.id}>
                <input
                  type="checkbox"
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

          <p className="startup-terms">By adding your startup, you agree to our <span>Terms of Service</span>.</p>
        </div>

        <div className="startup-dialog-footer">
          <Toggle label="List for sale" />
          <button type="submit" className="startup-submit" disabled>Add startup</button>
        </div>
      </form>
    </dialog>
  );
}

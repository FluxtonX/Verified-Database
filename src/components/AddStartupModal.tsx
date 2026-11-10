"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type RefObject } from "react";
import { importStartupSource } from "@/app/dashboard/actions";
import { Icon } from "./icons";

const providers = [
  {
    id: "stripe",
    name: "Stripe",
    logo: "/assets/provider-0.webp",
    placeholder: "rk_live_...",
    guide: "https://dashboard.stripe.com/apikeys/create?name=VerifiedDB&permissions%5B%5D=rak_charge_read&permissions%5B%5D=rak_subscription_read&permissions%5B%5D=rak_plan_read&permissions%5B%5D=rak_bucket_connect_read&permissions%5B%5D=rak_file_read&permissions%5B%5D=rak_product_read",
    instructions: [
      "Review the preset read-only permissions",
      "Create the restricted key",
      "Paste the key above to import your startup",
    ],
  },
  {
    id: "revenuecat",
    name: "RevenueCat",
    logo: "/assets/provider-5.webp",
    placeholder: "sk_...",
    guide: process.env.NEXT_PUBLIC_REVENUECAT_SETUP_URL || "https://www.revenuecat.com/docs/api-v2#api-v2-permissions",
    instructions: [
      "Open API keys in your project settings",
      "Create a new V2 API key",
      "Allow read access to Projects, Apps, Overview Metrics, and Charts",
    ],
  },
] as const;

type Provider = (typeof providers)[number];

function ProviderPicker({ provider, onSelect }: { provider: Provider; onSelect: (provider: Provider) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(-1);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const matches = providers.filter(option => option.name.toLowerCase().includes(query.trim().toLowerCase()));
  const activeOption = matches[highlighted];

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  function choose(option: Provider) {
    onSelect(option);
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div
      className="startup-provider-field"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label id="startup-provider-label" htmlFor="startup-provider">Choose your payment provider</label>
      <button
        id="startup-provider"
        ref={trigger}
        type="button"
        className="startup-provider-trigger"
        aria-labelledby="startup-provider-label startup-provider-value"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setQuery("");
          setHighlighted(-1);
          setOpen(!open);
        }}
      >
        <img src={provider.logo} width="18" height="18" alt="" />
        <span id="startup-provider-value">{provider.name}</span>
        <Icon name="chevrons" size={16} />
      </button>
      {open && (
        <div className="startup-provider-menu">
          <div className="startup-provider-search">
            <Icon name="search" size={16} />
            <input
              ref={search}
              role="combobox"
              aria-label="Search payment provider"
              aria-expanded={open}
              aria-controls="startup-provider-options"
              aria-activedescendant={activeOption && `startup-provider-${activeOption.id}`}
              placeholder="Search payment provider..."
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setHighlighted(-1);
              }}
              onKeyDown={event => {
                switch (event.key) {
                  case "ArrowDown":
                    event.preventDefault();
                    setHighlighted(Math.min(highlighted + 1, matches.length - 1));
                    break;
                  case "ArrowUp":
                    event.preventDefault();
                    setHighlighted(Math.max(highlighted - 1, 0));
                    break;
                  case "Enter":
                    event.preventDefault();
                    if (activeOption ?? matches[0]) choose(activeOption ?? matches[0]);
                    break;
                  case "Escape":
                    event.preventDefault();
                    setOpen(false);
                    trigger.current?.focus();
                    break;
                }
              }}
            />
          </div>
          <div id="startup-provider-options" role="listbox" aria-labelledby="startup-provider-label">
            {matches.map((option, index) => (
              <button
                key={option.id}
                id={`startup-provider-${option.id}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={option.id === provider.id}
                className="startup-provider-option"
                data-highlighted={index === highlighted}
                onMouseDown={event => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <img src={option.logo} width="18" height="18" alt="" />
                {option.name}
                {option.id === provider.id && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
          {matches.length === 0 && <p className="startup-provider-empty" role="status">No payment providers found.</p>}
        </div>
      )}
    </div>
  );
}

export default function AddStartupModal({ onClose, triggerRef, signedIn, next, startupId }: {
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  signedIn: boolean;
  next: string;
  startupId?: string;
}) {
  const [provider, setProvider] = useState<Provider>(providers[0]);
  const [state, action, pending] = useActionState(importStartupSource.bind(null, startupId ?? null), {});
  const stripe = provider.id === "stripe";
  const canImport = signedIn;
  useEffect(() => {
    if (state.saved) onClose();
  }, [state.saved, onClose]);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>("#startup-api-key")?.focus({ preventScroll: true });
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
          <h2 id="add-startup-title">{startupId ? "Connect a payment provider" : "Add your startup"}</h2>
          <span className="startup-visitors"><span className="visitor-dot" aria-hidden="true" /><strong>2</strong> payment providers</span>
        </div>
        <p id="add-startup-description">{startupId ? "Add a new source or refresh an existing one with its read-only key." : <>Showcase your revenue with <strong>Stripe or RevenueCat</strong>. It&apos;s free!</>}</p>
        <button type="button" className="startup-close" onClick={onClose} aria-label="Close add startup dialog"><Icon name="close" size={20} /></button>
      </header>

      <form className="startup-form" action={action}>
        <div className="startup-dialog-body">
          <ProviderPicker provider={provider} onSelect={setProvider} />
          <input type="hidden" name="provider" value={provider.id} />
          <div className="startup-key-field">
            <label htmlFor="startup-api-key">1. {provider.name} API key</label>
            <input
              key={provider.id}
              id="startup-api-key"
              name={canImport ? "api-key" : undefined}
              type="password"
              placeholder={provider.placeholder}
              readOnly={!canImport}
              required={canImport}
              autoComplete="off"
              spellCheck={false}
              maxLength={256}
              title={canImport ? undefined : "Sign in to connect a payment provider."}
            />
            <a className="startup-key-help" href={provider.guide} target="_blank" rel="noopener noreferrer" aria-label={`Open ${provider.name} API key setup guide (opens in a new tab)`}>
              <div>
                <p>Click here to create a read-only API key.</p>
                <ol>{provider.instructions.map(step => <li key={step}>{step}</li>)}</ol>
              </div>
              <Icon name="external" size={16} />
            </a>
          </div>

          {!stripe && <div className="startup-key-field">
            <label htmlFor="startup-project-id">RevenueCat project ID</label>
            <input id="startup-project-id" name="project-id" type="text" placeholder="proj..." maxLength={104} spellCheck={false} />
            <p className="muted">Optional if the key has access to just one project.</p>
          </div>}
          {!startupId && <div className="startup-handle-field">
            <label htmlFor="startup-x-handle">𝕏 handle (optional)</label>
            <input id="startup-x-handle" name="x-handle" type="text" placeholder="username" autoComplete="off" spellCheck={false} maxLength={16} />
          </div>}

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
        </div>

        <div className="startup-dialog-footer">
          {state.error && <p className="startup-import-error" role="alert">{state.error}</p>}
          {!signedIn ? (
            <Link className="startup-submit" href={`/login?next=${encodeURIComponent(next)}`}>Sign in to add</Link>
          ) : (
            <button type="submit" className="startup-submit" disabled={!canImport || pending}>{pending ? "Importing metrics…" : startupId ? "Connect provider" : "Add startup"}</button>
          )}
        </div>
      </form>
    </dialog>
  );
}

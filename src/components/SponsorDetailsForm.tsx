"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type FormEvent } from "react";
import { publishSponsor } from "@/app/advertise/actions";
import type { Sponsorship } from "@/lib/sponsorship";

const sponsorLogoMaxBytes = 800 * 1024;

export function SponsorDetailsForm({ sponsorship }: { sponsorship: Sponsorship }) {
  const [hasFile, setHasFile] = useState(false);

  function validateLogo(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const url = form.elements.namedItem("logo") as HTMLInputElement;
    const file = form.elements.namedItem("logoFile") as HTMLInputElement;
    url.setCustomValidity("");
    file.setCustomValidity("");
    if (file.files?.length) {
      if (file.files[0].size > sponsorLogoMaxBytes) {
        event.preventDefault();
        file.setCustomValidity("Choose an image under 800 KB.");
        file.reportValidity();
      }
    } else if (!url.value.trim()) {
      event.preventDefault();
      url.setCustomValidity("Add a logo URL or upload an image.");
      url.reportValidity();
    }
  }

  return <form action={publishSponsor} className="sponsor-details" onSubmit={validateLogo}>
    <label>Startup name<input name="name" maxLength={60} defaultValue={sponsorship.name ?? ""} required /></label>
    <label>Short description<textarea name="headline" maxLength={150} rows={3} defaultValue={sponsorship.headline ?? ""} required /></label>
    <label>Website URL<input type="url" name="website" maxLength={2048} placeholder="https://example.com" defaultValue={sponsorship.website_url ?? ""} required /></label>
    <p className="muted">VerifedDB referral tags are added automatically to sponsor-card links. Use your own landing page or partner URL.</p>
    <div className="sponsor-logo-fields">
      <strong>Logo image (required)</strong>
      {sponsorship.logo_url && <div className="sponsor-logo-current"><img src={sponsorship.logo_url} alt={`${sponsorship.name ?? "Sponsor"} current logo`} width="48" height="48" /><span>Current logo. Leave both fields unchanged to keep it.</span></div>}
      <label>HTTPS logo URL<input type="url" name="logo" maxLength={2048} placeholder="https://example.com/logo.png" defaultValue={sponsorship.logo_url ?? ""} disabled={hasFile} onInput={event => event.currentTarget.setCustomValidity("")} /></label>
      <span className="muted">or upload a file from your computer</span>
      <label>Upload logo<input type="file" name="logoFile" accept="image/png,image/jpeg,image/webp" onChange={event => { setHasFile(Boolean(event.currentTarget.files?.length)); event.currentTarget.setCustomValidity(""); }} /></label>
      <small className="muted">PNG, JPG, or WebP · up to 800 KB. A selected file takes priority over the URL.</small>
    </div>
    <button className="add-startup sponsor-primary">{sponsorship.name ? "Save sponsor card" : "Publish sponsor card"}</button>
  </form>;
}

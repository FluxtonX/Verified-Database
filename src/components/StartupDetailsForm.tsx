"use client";

import { startTransition, useActionState, useState } from "react";
import { updateStartupDetails } from "@/app/dashboard/actions";
import { startupTeamSizes } from "@/lib/startup-details";
import StartupLogoPicker from "./StartupLogoPicker";

export type StartupDetails = {
  id: string;
  name: string;
  description: string;
  website_url: string | null;
  x_handle: string | null;
  country: string | null;
  mobile_app: boolean;
  funding: string | null;
  team_size: string | null;
  founded_on: string | null;
  profit_margin_pct: number | null;
  markets: string[];
  tech_stack: string[];
  marketing_channels: string[];
  value_proposition: string;
  problem_solved: string;
  app_store_url: string | null;
  google_play_url: string | null;
  audience_description: string;
  pricing: string;
  additional_info: string;
  imported_logo_url: string | null;
};

export default function StartupDetailsForm({ startup, logoUrl }: { startup: StartupDetails; logoUrl?: string }) {
  const [state, action, pending] = useActionState(updateStartupDetails.bind(null, startup.id), {});

  const [mobile, setMobile] = useState(startup.mobile_app);

  return (
    <form className="dashboard-details" action={action} onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      startTransition(() => action(form));
    }}>
      <div className="dashboard-identity">
        <StartupLogoPicker id={startup.id} name={startup.name} src={logoUrl} />
        <div className="dashboard-fields">
          <label>Name <input name="name" defaultValue={startup.name} required maxLength={100} /></label>
          <label>Description <textarea name="description" defaultValue={startup.description} maxLength={500} rows={4} placeholder="Brief description of your startup..." /></label>
        </div>
      </div>

      <label>Website URL <input name="website" type="url" defaultValue={startup.website_url ?? ""} maxLength={2048} placeholder="https://example.com" /></label>
      <div className="dashboard-app-stores">
        <label className="dashboard-mobile"><span>My product is a mobile app</span><input name="mobile-app" type="checkbox" checked={mobile} onChange={event => setMobile(event.target.checked)} /></label>
        <div className="dashboard-store-fields" hidden={!mobile}>
          <label>Apple App Store <input name="app-store" type="url" defaultValue={startup.app_store_url ?? ""} maxLength={2048} placeholder="https://apps.apple.com/..." disabled={!mobile} /></label>
          <label>Google Play <input name="google-play" type="url" defaultValue={startup.google_play_url ?? ""} maxLength={2048} placeholder="https://play.google.com/store/apps/details?id=..." disabled={!mobile} /></label>
        </div>
      </div>

      <label>Markets <small>Up to 5, separated by commas</small><input name="markets" defaultValue={startup.markets.join(", ")} maxLength={504} /></label>
      <label>Tech stack <small>Up to 20, separated by commas</small><input name="tech-stack" defaultValue={startup.tech_stack.join(", ")} maxLength={2019} /></label>
      <label>Marketing channels <small>Up to 15, separated by commas</small><input name="marketing-channels" defaultValue={startup.marketing_channels.join(", ")} maxLength={1514} /></label>
      <label>Founder&apos;s 𝕏 handle <input name="x-handle" defaultValue={startup.x_handle ?? ""} placeholder="@username" maxLength={16} /></label>
      <label>Profit margin last 30 days (%) <input name="profit-margin" type="number" max="100" min="-99999.99" step="0.01" defaultValue={startup.profit_margin_pct ?? ""} /></label>

      <fieldset className="dashboard-section">
        <legend>Company details</legend>
        <div className="dashboard-field-grid">
          <label>Country code <input name="country" defaultValue={startup.country ?? ""} maxLength={2} pattern="[A-Za-z]{2}" placeholder="PK" /></label>
          <label>Funding
            <select name="funding" defaultValue={startup.funding ?? ""}>
              <option value="">Select funding</option>
              <option value="bootstrapped">Bootstrapped</option>
              <option value="vc-backed">VC-backed</option>
            </select>
          </label>
          <label>Team size
            <select name="team-size" defaultValue={startup.team_size ?? ""}>
              <option value="">Select team size</option>
              {startupTeamSizes.map(size => <option key={size} value={size}>{size} {size === "1" ? "person" : "people"}</option>)}
            </select>
          </label>
          <label>Founded date <input name="founded-on" type="date" defaultValue={startup.founded_on ?? ""} /></label>
        </div>
      </fieldset>
      <fieldset className="dashboard-section">
        <legend>Product details</legend>
        <div className="dashboard-field-grid">
          <label>Value proposition <textarea name="value-proposition" defaultValue={startup.value_proposition} maxLength={500} rows={3} /></label>
          <label>Problem solved <textarea name="problem-solved" defaultValue={startup.problem_solved} maxLength={500} rows={3} /></label>
          <label>Audience <textarea name="audience-description" defaultValue={startup.audience_description} maxLength={500} rows={3} /></label>
          <label>Pricing <textarea name="pricing" defaultValue={startup.pricing} maxLength={500} rows={3} /></label>
          <label className="dashboard-wide">Additional info <textarea name="additional-info" defaultValue={startup.additional_info} maxLength={500} rows={3} /></label>
        </div>
      </fieldset>

      <div className="dashboard-save">
        {state.error && <p role="alert">{state.error}</p>}
        {state.saved && <p role="status">Changes saved.</p>}
        <button className="startup-submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}

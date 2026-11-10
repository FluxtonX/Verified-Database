"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  changeSellerEmail, requestAccountDeletion, requestSaleListing, savePublicProfile, saveSellerPreferences,
  saveSocialLink, sendSellerFeedback, sendSellerMessage, setSellerLeadArchived, uploadProfilePicture,
} from "@/app/dashboard/seller-actions";
import { resizeImage } from "@/lib/resize-image";
import type { SellerProfile } from "@/lib/seller-dashboard";
import { Icon } from "./icons";
import StartupLogo from "./StartupLogo";

function Result({ state }: { state: { error?: string; message?: string } }) {
  return state.error ? <p className="seller-error" role="alert">{state.error}</p>
    : state.message ? <p className="seller-result" role="status">{state.message}</p> : null;
}

function ProfilePicture({ name, src }: { name: string; src?: string }) {
  const picker = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ error?: string; message?: string }>({});
  const [pending, startUpload] = useTransition();

  return <div className="seller-picture">
    <StartupLogo name={name || "—"} src={src} />
    <input type="file" accept="image/jpeg,image/png,image/webp" ref={picker} hidden onChange={event => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (!file) return;
      setState({});
      startUpload(async () => {
        try {
          const picture = await resizeImage(file);
          if (!picture) { setState({ error: "Choose a supported image." }); return; }
          const form = new FormData();
          form.set("picture", picture, "picture.png");
          setState(await uploadProfilePicture(form));
        } catch {
          setState({ error: "Couldn’t upload your picture." });
        }
      });
    }} />
    <button className="seller-button" type="button" disabled={pending} onClick={() => picker.current?.click()}>
      <Icon name="share" size={16} />{pending ? "Uploading…" : "Upload picture"}
    </button>
    <small>JPG, PNG, or WebP</small>
    <Result state={state} />
  </div>;
}

export function SellerProfileForm({ profile }: { profile: SellerProfile | null }) {
  const [state, action, pending] = useActionState(savePublicProfile, {});
  const [name, setName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");

  return <section className="seller-card">
    <h2>My public profile</h2>
    <div className="seller-profile-editor">
      <ProfilePicture name={profile?.display_name ?? ""} src={profile?.avatar_url ?? undefined} />
      <form action={action} className="seller-form">
        <label>Name<input name="name" value={name} onChange={event => setName(event.target.value)} maxLength={100} placeholder="Your name" required /></label>
        <label><span className="seller-field-label">Description <small>{bio.length}/180</small></span>
          <textarea name="bio" value={bio} onChange={event => setBio(event.target.value)} maxLength={180} rows={4} placeholder="What are you building or looking to buy?" />
        </label>
        <div className="seller-form-actions"><Result state={state} /><button className="startup-submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button></div>
      </form>
    </div>
  </section>;
}

function SocialCard({ platform, value }: { platform: "x" | "linkedin"; value?: string | null }) {
  const [state, action, pending] = useActionState(saveSocialLink.bind(null, platform), {});
  const [editing, setEditing] = useState(false);
  const label = platform === "x" ? "X (Twitter)" : "LinkedIn";
  const href = platform === "x" && value ? `https://x.com/${value}` : value;

  return <article className="seller-social">
    <h3><span aria-hidden="true" className={platform === "linkedin" ? "seller-linkedin" : ""}>{platform === "x" ? "𝕏" : "in"}</span>{label}</h3>
    <div className="seller-social-status">
      {href ? <a href={href} target="_blank" rel="noopener noreferrer">{platform === "x" ? `@${value}` : "View linked profile"} <Icon name="external" size={15} /></a> : "No profile linked yet."}
    </div>
    {editing ? <form action={action} className="seller-form">
      <label>{platform === "x" ? "X username" : "LinkedIn profile URL"}
        <input name="social" defaultValue={value ?? ""} maxLength={platform === "x" ? 16 : 512} placeholder={platform === "x" ? "@username" : "https://www.linkedin.com/in/your-name"} />
      </label>
      <div className="seller-inline"><button className="startup-submit" disabled={pending}>Save link</button><button className="seller-button" type="button" onClick={() => setEditing(false)}>Close</button></div>
    </form> : <button className="startup-submit" type="button" onClick={() => setEditing(true)}>{value ? "Edit link" : "Connect"}</button>}
    <Result state={state} />
  </article>;
}

export function SellerSocials({ profile }: { profile: SellerProfile | null }) {
  return <section className="seller-card">
    <h2>Socials</h2>
    <p className="muted">Add links so buyers can learn more about you.</p>
    <div className="seller-social-grid">
      <SocialCard platform="x" value={profile?.x_handle} />
      <SocialCard platform="linkedin" value={profile?.linkedin_url} />
    </div>
  </section>;
}

export function SellerSettings({ email, profile }: { email: string; profile: SellerProfile | null }) {
  const [prefs, preferencesAction, saving] = useActionState(saveSellerPreferences, {});
  const [emailResult, emailAction, changing] = useActionState(changeSellerEmail, {});
  const [deletion, deleteAction, requesting] = useActionState(requestAccountDeletion, {});
  const [editEmail, setEditEmail] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const zone = profile?.timezone ?? "UTC";
  const zones = ["UTC", ...Intl.supportedValuesOf("timeZone")];
  if (!zones.includes(zone)) zones.unshift(zone);

  return <>
    {showNotice && <section className="seller-notice">
      <Icon name="mail" size={22} />
      <div><h2>Don&apos;t miss important notifications</h2><p>Choose which messages and buyer activity you want to hear about.</p></div>
      <button className="seller-dismiss" type="button" aria-label="Dismiss notifications note" onClick={() => setShowNotice(false)}><Icon name="close" size={16} /></button>
    </section>}
    <form action={preferencesAction} className="seller-stack">
      <section className="seller-card seller-settings-card">
        <h2>Email notifications</h2>
        <p className="muted">Your preferences are saved here. Email delivery is pending setup.</p>
        <label className="seller-toggle-row"><span><strong>Unread messages</strong><small>Hear about important messages from buyers.</small></span>
          <input className="seller-switch" name="messages" type="checkbox" role="switch" defaultChecked={profile?.notify_messages ?? true} /></label>
        <label className="seller-toggle-row"><span><strong>Startup saved notifications</strong><small>When a buyer saves one of your startups to their favorites.</small></span>
          <input className="seller-switch" name="saved" type="checkbox" role="switch" defaultChecked={profile?.notify_saved ?? true} /></label>
      </section>
      <section className="seller-card seller-timezone seller-form">
        <label><strong>Timezone</strong><select name="timezone" defaultValue={zone}>{zones.map(value => <option key={value} value={value}>{value.replaceAll("_", " ").replaceAll("/", " / ")}</option>)}</select></label>
        <div className="seller-form-actions"><Result state={prefs} /><button className="startup-submit" disabled={saving}>{saving ? "Saving…" : "Save preferences"}</button></div>
      </section>
    </form>
    <section className="seller-card seller-account-settings">
      <div className="seller-account-heading"><div><h2>Account</h2><p>{email || "No email on file"}</p></div>
        <button className="seller-button" type="button" onClick={() => setEditEmail(!editEmail)}>{editEmail ? "Close" : "Change email"}</button></div>
      {editEmail && <form action={emailAction} className="seller-form">
        <label>New email address<input name="email" type="email" required maxLength={254} placeholder="you@example.com" /></label>
        <div className="seller-form-actions"><Result state={emailResult} /><button className="startup-submit" disabled={changing}>Send confirmation</button></div>
      </form>}
      <div className="seller-delete">
        {profile?.deletion_requested_at ? <form action={deleteAction} className="seller-form">
          <p>Account deletion requested. Your account stays active during review.</p>
          <button className="seller-button" name="intent" value="cancel" disabled={requesting} onClick={() => setConfirmDelete(false)}>Cancel request</button>
          <Result state={deletion} />
        </form> : confirmDelete ? <form action={deleteAction} className="seller-form">
          <label>Type DELETE to submit a deletion request<input name="confirm" required autoComplete="off" /></label>
          <div className="seller-form-actions"><Result state={deletion} /><button className="seller-button" type="button" onClick={() => setConfirmDelete(false)}>Cancel</button><button className="startup-submit" disabled={requesting}>Request deletion</button></div>
        </form> : <button className="seller-danger" type="button" onClick={() => setConfirmDelete(true)}>Delete account</button>}
      </div>
    </section>
  </>;
}

export function SellerFeedback({ sent }: { sent: number }) {
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(async (previous: Parameters<typeof sendSellerFeedback>[0], form: FormData) => {
    const result = await sendSellerFeedback(previous, form);
    if (result.message) setBody("");
    return result;
  }, {});
  const left = Math.max(0, 10 - sent);

  return <section className="seller-card">
    <h2>Send seller feedback</h2>
    <p className="muted">Tell us what would improve your experience. You can send up to 10 messages.</p>
    <form className="seller-form seller-feedback-form" action={action}>
      <textarea aria-label="Seller feedback" name="feedback" rows={7} required maxLength={2000}
        value={body} onChange={event => setBody(event.target.value)} disabled={!left || pending}
        placeholder="What should we improve in the seller dashboard, listing flow, inbox, or marketplace?" />
      <div className="seller-form-actions">
        <small>{body.length}/2000 characters · {left} {left === 1 ? "message" : "messages"} left</small>
        <button className="startup-submit" disabled={pending || !left || !body.trim()}>{pending ? "Sending…" : "Send feedback"}</button>
      </div>
      <Result state={state} />
    </form>
    <p className="muted">Thanks for helping us improve VerifedDB.</p>
  </section>;
}

export function SellerReply({ id }: { id: string }) {
  const [state, action, pending] = useActionState(sendSellerMessage.bind(null, id), {});
  return <form action={action} className="seller-form seller-reply">
    <textarea aria-label="Message" name="message" rows={2} required maxLength={2000} placeholder="Write a message…" />
    <div className="seller-form-actions"><Result state={state} /><button className="startup-submit" disabled={pending}>{pending ? "Sending…" : "Send"}</button></div>
  </form>;
}

export function SellerArchive({ id, archived }: { id: string; archived: boolean }) {
  const [state, action, pending] = useActionState(setSellerLeadArchived.bind(null, id, !archived), {});
  return <form action={action}><button className="seller-button" disabled={pending}>{archived ? "Restore" : "Archive"}</button><Result state={state} /></form>;
}

export function SaleRequest({ id, requested }: { id: string; requested: boolean }) {
  const [state, action, pending] = useActionState(requestSaleListing.bind(null, id), {});
  return <form action={action} className="seller-listing-action">
    <button className="seller-button" disabled={pending || requested || Boolean(state.message)}>
      {requested || state.message ? "Request saved" : pending ? "Saving…" : "Get started →"}
    </button>
    {state.error && <Result state={state} />}
  </form>;
}

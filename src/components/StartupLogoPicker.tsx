"use client";

import { useRef, useState, useTransition } from "react";
import { uploadStartupLogo } from "@/app/dashboard/actions";
import { resizeImage } from "@/lib/resize-image";
import StartupLogo from "./StartupLogo";

export default function StartupLogoPicker({ id, name, src }: { id: string; name: string; src?: string }) {
  const picker = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, startUpload] = useTransition();

  function choose(file: File) {
    setError("");
    startUpload(async () => {
      try {
        const logo = await resizeImage(file);
        if (!logo) {
          setError("This image couldn’t be opened. Choose another image.");
          return;
        }
        const form = new FormData();
        form.set("logo", logo, "logo.png");
        const result = await uploadStartupLogo(id, form);
        if (result.error) setError(result.error);
      } catch {
        setError("Couldn’t upload this image. Try another photo.");
      }
    });
  }

  return (
    <div className="dashboard-logo-picker">
      <input type="file" accept="image/*" ref={picker} hidden onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (file) choose(file);
      }} />
      <button type="button" aria-label="Change startup logo" disabled={pending} onClick={() => picker.current?.click()}>
        <StartupLogo name={name} src={src} />
        <small>{pending ? "Uploading…" : "Change logo"}</small>
      </button>
      {error && <p className="dashboard-logo-error" role="alert">{error}</p>}
    </div>
  );
}

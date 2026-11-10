"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

export default function StartupLogo({ name, src }: { name: string; src?: string }) {
  const [failed, setFailed] = useState<string>();
  return (
    <span className="dashboard-startup-mark" aria-hidden="true">
      {src && src !== failed ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(src)} /> : name.slice(0, 2).toUpperCase()}
    </span>
  );
}

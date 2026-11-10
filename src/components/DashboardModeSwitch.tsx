"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { sellerUrl, type DashboardMode } from "@/lib/seller-dashboard";

export default function DashboardModeSwitch({ mode }: { mode: DashboardMode }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [nextMode, setNextMode] = useState<DashboardMode>(mode);
  const label = nextMode === "buyer" ? "Buyer" : "Seller";

  function switchMode() {
    dialog.current?.close();
    router.push(nextMode === "buyer" ? "/dashboard?mode=buyer" : sellerUrl("my-startups"));
  }

  return <>
    <div className="dashboard-mode" role="group" aria-label="Dashboard mode">
      {(["buyer", "seller"] as const).map(next => (
        <button key={next} type="button" aria-pressed={mode === next} onClick={() => {
          if (mode === next) return;
          setNextMode(next);
          dialog.current?.showModal();
        }}>{next === "buyer" ? "Buyer" : "Seller"}</button>
      ))}
    </div>
    <dialog ref={dialog} className="dashboard-mode-dialog" aria-labelledby="dashboard-mode-heading" aria-describedby="dashboard-mode-question">
      <h2 id="dashboard-mode-heading">VerifedDB</h2>
      <p id="dashboard-mode-question">Switch to VerifedDB {label} Mode?</p>
      <div className="dashboard-mode-actions">
        <button type="button" onClick={() => dialog.current?.close()} autoFocus>Cancel</button>
        <button type="button" onClick={switchMode}>OK</button>
      </div>
    </dialog>
  </>;
}

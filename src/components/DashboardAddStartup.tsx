"use client";

import { useRef, useState } from "react";
import AddStartupModal from "./AddStartupModal";
import { Icon } from "./icons";

export default function DashboardAddStartup({ startupId }: { startupId?: string }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button ref={trigger} type="button" className="startup-submit" onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} /> {startupId ? "Connect provider" : "Add"}
      </button>
      {open && <AddStartupModal triggerRef={trigger} onClose={() => setOpen(false)} signedIn next="/dashboard" startupId={startupId} />}
    </>
  );
}

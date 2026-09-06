"use client";

import { useEffect, useState } from "react";

export function ProfileViewSwitch({ initialView = "premium" }: { initialView?: "free" | "premium" }) {
  const [view, setView] = useState<"free" | "premium">(initialView);

  useEffect(() => {
    const frame = document.querySelector<HTMLElement>("[data-profile-frame]");
    frame?.setAttribute("data-profile-view", view);
  }, [view]);

  return <div className="showcase-view-switch" role="group" aria-label="Profilansicht">
    <button type="button" className={view === "free" ? "active" : ""} onClick={() => setView("free")}>Free</button>
    <button type="button" className={view === "premium" ? "active" : ""} onClick={() => setView("premium")}>Premium</button>
  </div>;
}

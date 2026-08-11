"use client";

import { usePathname } from "next/navigation";
import { gardenSettings } from "../lib/garden-config";
import { PlantIcon } from "./plant-icon";

export function SiteFooter() {
  const pathname = usePathname();
  const settings = gardenSettings;

  if (pathname === "/") return null;

  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <PlantIcon />
        <p><b>PLANTED BY {settings.headerName.toUpperCase()}</b><small>Keep planting. Keep growing.</small></p>
      </div>
      <p className="site-footer-note">© 2026 {settings.headerName}&apos;s Garden<br />Built with curiosity</p>
    </footer>
  );
}
